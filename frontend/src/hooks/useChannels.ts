/**
 * React Query hooks for channel management.
 * Connects to the Django backend API.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export type SourceStatus = 'active' | 'inactive'

export interface Source {
  id: string
  name: string
  sla_minutes: number | null
  effective_sla: number | null
  status: SourceStatus
  linked_user: string | null
  linked_user_name: string | null
  channel_name: string
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  name: string
  description: string
  is_trusted: boolean
  default_sla_minutes: number | null
  is_active: boolean
  owner: string | null
  owner_name: string | null
  monthly_spend: string | null
  sources: Source[]
  source_count: number
  created_at: string
  updated_at: string
}

export interface ChannelListItem {
  id: string
  name: string
  description: string
  is_trusted: boolean
  default_sla_minutes: number | null
  is_active: boolean
  owner: string | null
  owner_name: string | null
  monthly_spend: string | null
  source_count: number
  created_at: string
}

export interface MSUser {
  id: string
  name: string
  email: string
}

interface PaginatedResponse<T> {
  results: T[]
  count: number
}

/**
 * Hook for fetching all channels.
 */
export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async (): Promise<ChannelListItem[]> => {
      const response = await api.get<PaginatedResponse<ChannelListItem> | ChannelListItem[]>('/channels/')
      if (Array.isArray(response)) {
        return response
      }
      return response.results || []
    },
  })
}

/**
 * Hook for fetching a single channel with sources.
 */
export function useChannel(id: string) {
  return useQuery({
    queryKey: ['channels', id],
    queryFn: async (): Promise<Channel> => {
      return await api.get<Channel>(`/channels/${id}/`)
    },
    enabled: !!id,
  })
}

/**
 * Hook for creating a new channel.
 */
export function useCreateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      is_trusted: boolean
      default_sla_minutes?: number | null
      owner?: string | null
      monthly_spend?: string | null
    }) => {
      try {
        return await api.post<Channel>('/channels/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to create channel')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for updating a channel.
 */
export function useUpdateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Channel> }) => {
      try {
        return await api.patch<Channel>(`/channels/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update channel')
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['channels'] })
      queryClient.refetchQueries({ queryKey: ['channels', variables.id] })
    },
  })
}

/**
 * Hook for deleting a channel.
 */
export function useDeleteChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/channels/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to delete channel')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for adding a source to a channel.
 */
export function useAddSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ channelId, name }: { channelId: string; name: string }) => {
      try {
        return await api.post<Source>(`/channels/${channelId}/add_source/`, { name })
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to add source')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for updating a source.
 */
export function useUpdateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; sla_minutes?: number | null; status?: SourceStatus; linked_user?: string | null } }) => {
      try {
        return await api.patch<Source>(`/sources/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update source')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for deleting a source.
 */
export function useDeleteSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/sources/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to delete source')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for fetching MS users for BH Mortgage Team dropdown.
 */
export function useMSUsers() {
  return useQuery({
    queryKey: ['ms-users'],
    queryFn: async (): Promise<MSUser[]> => {
      return await api.get<MSUser[]>('/sources/ms_users/')
    },
  })
}

/**
 * Source filter option for dropdowns.
 */
export interface SourceFilterOption {
  id: string
  name: string
  channelName: string
  isTrusted: boolean
}

interface SourceFilterResponse {
  id: string
  name: string
  channel_name: string
  is_trusted: boolean
}

/**
 * Hook for fetching sources for filter dropdown.
 * @param filter - 'trusted' for trusted only, 'untrusted' for untrusted only, 'all' for all sources
 */
export function useSourcesForFilter(filter: 'trusted' | 'untrusted' | 'all' = 'all') {
  return useQuery({
    queryKey: ['sources-filter', filter],
    queryFn: async (): Promise<SourceFilterOption[]> => {
      const response = await api.get<SourceFilterResponse[]>('/sources/for_filter/', {
        trust: filter,
      })
      return response.map((item) => ({
        id: item.id,
        name: item.name,
        channelName: item.channel_name,
        isTrusted: item.is_trusted,
      }))
    },
  })
}
