/**
 * WebSocket hook for real-time Lead WhatsApp message updates.
 *
 * Connects to Django Channels WebSocket endpoint and updates
 * React Query cache when new messages arrive.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LeadWhatsAppMessage, LeadMessagesResponse } from './useLeadWhatsApp'

// WebSocket URL for lead WhatsApp
const getWebSocketUrl = (leadId: string, token: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_WS_HOST || 'localhost:8000'
  return `${protocol}//${host}/ws/leads/${leadId}/whatsapp/?token=${token}`
}

/**
 * Hook for real-time Lead WhatsApp message updates via WebSocket.
 *
 * @param leadId - The lead ID to subscribe to
 * @returns WebSocket connection state
 */
export function useLeadWhatsAppWebSocket(leadId: string | null) {
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

    const wsUrl = getWebSocketUrl(leadId, token)
    console.log('Connecting Lead WebSocket:', wsUrl.replace(/token=.*/, 'token=***'))

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log(`Lead WebSocket connected for lead ${leadId}`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Lead WebSocket message received:', data.event)

        if (data.event === 'new_message') {
          // Update React Query cache with new message
          queryClient.setQueryData<LeadMessagesResponse>(
            ['lead-whatsapp-messages', leadId],
            (old) => {
              if (!old) return old

              // Check for duplicate
              const exists = old.messages.some((m) => m.id === data.data.id)
              if (exists) {
                console.log('Duplicate lead message ignored')
                return old
              }

              console.log('Adding new lead message to cache')
              return {
                ...old,
                messages: [...old.messages, data.data as LeadWhatsAppMessage],
                count: old.count + 1,
              }
            }
          )
        } else if (data.event === 'status_update') {
          // Update message status in cache
          queryClient.setQueryData<LeadMessagesResponse>(
            ['lead-whatsapp-messages', leadId],
            (old) => {
              if (!old) return old

              return {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === data.data.message_id ? { ...m, status: data.data.status } : m
                ),
              }
            }
          )
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
