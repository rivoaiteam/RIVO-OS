/**
 * React Query hooks for Lead Campaign tracking.
 * Handles campaign dashboard, journey, and real-time updates via WebSocket.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  LeadData,
  LeadListItem,
  LeadInteraction,
  LeadMessage,
  LeadJourneyResponse,
  CampaignDashboardResponse,
  CampaignStatus,
  PaginatedResponse,
} from '@/types/mortgage'

/**
 * Hook for fetching campaign dashboard data.
 * Returns status distribution, total leads, response rate, and recent leads.
 */
export function useCampaignDashboard() {
  return useQuery({
    queryKey: ['leads', 'campaign-dashboard'],
    queryFn: async (): Promise<CampaignDashboardResponse> => {
      return await api.get<CampaignDashboardResponse>('/leads/campaign_dashboard/')
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

/**
 * Hook for fetching leads filtered by campaign status.
 */
export function useLeadsByCampaignStatus(
  campaignStatus: CampaignStatus | 'all',
  params: { page?: number; page_size?: number; search?: string } = {}
) {
  const { page = 1, page_size = 10, search = '' } = params

  return useQuery({
    queryKey: ['leads', 'by-campaign-status', campaignStatus, { page, page_size, search }],
    queryFn: async (): Promise<PaginatedResponse<LeadListItem>> => {
      if (campaignStatus === 'all') {
        return await api.get<PaginatedResponse<LeadListItem>>('/leads/', {
          page,
          page_size,
          search: search || undefined,
        })
      }
      return await api.get<PaginatedResponse<LeadListItem>>('/leads/by_campaign_status/', {
        status: campaignStatus,
        page,
        page_size,
        search: search || undefined,
      })
    },
  })
}

// Campaign enrollment type
interface CampaignEnrollment {
  id: string
  campaign_id: string
  campaign_name: string
  status: 'enrolled' | 'progressing' | 'stalled' | 'completed' | 'dropped'
  current_step: {
    name: string
    order: number
  } | null
  enrolled_at: string
  completed_at: string | null
}

// Journey API response type (different from LeadJourneyResponse)
interface JourneyApiResponse {
  lead_id: string
  lead_name: string
  lead_phone: string
  current_status: CampaignStatus
  current_status_display: string
  current_tags: string[]
  journey: Array<{
    type: 'interaction' | 'message'
    interaction_type?: string
    content: string
    tag_value?: string
    template_name?: string
    created_at: string
    metadata?: Record<string, unknown>
    direction?: string
    message_type?: string
    status?: string
    button_payload?: string
  }>
  campaign_enrollments: CampaignEnrollment[]
  stats: {
    total_interactions: number
    total_messages: number
    first_response: string | null
    last_response: string | null
    response_count: number
  }
}

/**
 * Hook for fetching a lead's complete journey (interactions and messages).
 */
export function useLeadJourney(leadId: string | null) {
  return useQuery({
    queryKey: ['leads', leadId, 'journey'],
    queryFn: async (): Promise<JourneyApiResponse> => {
      return await api.get<JourneyApiResponse>(`/leads/${leadId}/journey/`)
    },
    enabled: !!leadId,
  })
}

/**
 * Hook for fetching available campaign status choices.
 */
export function useCampaignStatuses() {
  return useQuery({
    queryKey: ['leads', 'campaign-statuses'],
    queryFn: async (): Promise<{ value: string; label: string }[]> => {
      return await api.get<{ value: string; label: string }[]>('/leads/campaign_statuses/')
    },
    staleTime: Infinity, // Status choices don't change
  })
}

// WebSocket URL for lead updates
const getLeadWebSocketUrl = (leadId: string, token: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_WS_HOST || 'localhost:8000'
  return `${protocol}//${host}/ws/leads/${leadId}/?token=${token}`
}

/**
 * WebSocket hook for real-time lead updates.
 *
 * @param leadId - The lead ID to subscribe to, or 'dashboard' for all campaign updates
 */
export function useLeadWebSocket(leadId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getAuthToken = useCallback(() => {
    const stored = localStorage.getItem('rivo-auth')
    if (stored) {
      try {
        const auth = JSON.parse(stored)
        return auth.access_token
      } catch {
        return null
      }
    }
    return null
  }, [])

  const connect = useCallback(() => {
    if (!leadId) return

    const token = getAuthToken()
    if (!token) {
      console.warn('No auth token available for Lead WebSocket connection')
      return
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    const wsUrl = getLeadWebSocketUrl(leadId, token)
    console.log('Connecting Lead WebSocket:', wsUrl.replace(/token=.*/, 'token=***'))

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log(`Lead WebSocket connected for ${leadId}`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Lead WebSocket message received:', data.type)

        if (data.type === 'lead_update') {
          // Update the specific lead in cache
          if (data.lead?.id) {
            queryClient.setQueryData<LeadData>(['leads', data.lead.id], data.lead)
            // Also invalidate list queries
            queryClient.invalidateQueries({ queryKey: ['leads'] })
          }
        } else if (data.type === 'new_response') {
          // A lead received a new response
          if (data.lead?.id) {
            queryClient.setQueryData<LeadData>(['leads', data.lead.id], data.lead)
            // Invalidate journey to include new message
            queryClient.invalidateQueries({ queryKey: ['leads', data.lead.id, 'journey'] })
            // Invalidate dashboard for updated counts
            queryClient.invalidateQueries({ queryKey: ['leads', 'campaign-dashboard'] })
          }
        } else if (data.type === 'tag_change') {
          // Lead tags changed
          if (data.lead?.id) {
            queryClient.setQueryData<LeadData>(['leads', data.lead.id], data.lead)
            // Invalidate lists as campaign_status may have changed
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['leads', 'by-campaign-status'] })
            queryClient.invalidateQueries({ queryKey: ['leads', 'campaign-dashboard'] })
          }
        }
      } catch (err) {
        console.error('Error parsing Lead WebSocket message:', err)
      }
    }

    ws.onclose = (event) => {
      console.log(`Lead WebSocket closed: code=${event.code}, reason=${event.reason}`)
      wsRef.current = null

      // Reconnect after 3 seconds (unless intentionally closed)
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting Lead WebSocket reconnect...')
          connect()
        }, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('Lead WebSocket error:', error)
    }
  }, [leadId, getAuthToken, queryClient])

  useEffect(() => {
    connect()

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [connect])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  }
}

/**
 * Hook for subscribing to all campaign lead updates (dashboard view).
 * NOTE: Backend doesn't have /ws/leads/dashboard/ route yet, so disabled for now.
 */
export function useCampaignDashboardWebSocket() {
  // Disabled until backend implements dashboard WebSocket
  return { isConnected: false }
}
