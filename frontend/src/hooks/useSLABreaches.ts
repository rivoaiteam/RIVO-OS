/**
 * React Query hooks for SLA Breach management.
 * Connects to the Django backend API for oversight role (Channel Owner / Admin) SLA breach dashboard.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type {
  SLABreachesQueryParams,
  SLABreachesResponse,
} from '@/types/sla'
import type { UserData } from '@/hooks/useUsers'

/**
 * Hook for fetching SLA breaches list (Channel Owner / Admin).
 */
export function useSLABreaches(params: SLABreachesQueryParams = {}) {
  const { sla_type = 'all', owner = 'all', page = 1, page_size = 10, search } = params

  return useQuery({
    queryKey: ['sla-breaches', { sla_type, owner, page, page_size, search }],
    queryFn: async (): Promise<SLABreachesResponse> => {
      return await api.get<SLABreachesResponse>('/sla-breaches/', {
        sla_type: sla_type !== 'all' ? sla_type : undefined,
        owner: owner !== 'all' ? owner : undefined,
        page,
        page_size,
        search: search || undefined,
      })
    },
  })
}

/**
 * Hook for getting count of SLA breaches (for navigation badge).
 */
export function useSLABreachCount() {
  return useQuery({
    queryKey: ['sla-breaches', 'count'],
    queryFn: async (): Promise<number> => {
      const response = await api.get<SLABreachesResponse>('/sla-breaches/')
      return response.total
    },
    // Refresh every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * Hook for reassigning a client to a new owner.
 */
export function useReassignClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      try {
        return await api.patch<{ id: string; assigned_to: { id: string; name: string } }>(
          `/clients/${id}/reassign/`,
          { assigned_to }
        )
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to reassign client')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-breaches'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

/**
 * Hook for reassigning a case to a new owner.
 */
export function useReassignCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      try {
        return await api.patch<{ id: string; assigned_to: { id: string; name: string } }>(
          `/cases/${id}/reassign/`,
          { assigned_to }
        )
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to reassign case')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-breaches'] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

/**
 * Hook for fetching active users for reassignment dropdown.
 * Returns only MS and PO users (not channel owners, team leaders, or admins).
 */
export function useActiveUsers() {
  return useQuery({
    queryKey: ['users', 'active', 'assignable'],
    queryFn: async (): Promise<UserData[]> => {
      // Fetch all active users for dropdown
      const response = await api.get<{ items: UserData[]; total: number }>('/users/', {
        status: 'active',
        page_size: 100,
      })
      // Filter to only MS and PO users for assignment
      return response.items.filter(
        user => user.role === 'mortgage_specialist' || user.role === 'process_officer'
      )
    },
  })
}
