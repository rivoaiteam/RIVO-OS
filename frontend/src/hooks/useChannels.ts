/**
 * React Query hooks for channel management.
 * Connects to the Django backend API.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export type SubSourceStatus = 'active' | 'inactive' | 'incubation' | 'live' | 'paused'

export interface SubSource {
  id: string
  name: string
  sla_minutes: number | null
  effective_sla: number | null
  linked_user: string | null
  linked_user_name: string | null
  status: SubSourceStatus
  created_at: string
  updated_at: string
}

export interface Source {
  id: string
  name: string
  sla_minutes: number | null
  effective_sla: number | null
  is_active: boolean
  sub_sources: SubSource[]
  sub_source_count: number
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
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        return response
      }
      return response.results || []
    },
  })
}

/**
 * Hook for fetching a single channel with sources and sub-sources.
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
      queryClient.invalidateQueries({ queryKey: ['channels'] })
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
      // Refetch all channel queries to update inherited SLA values
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
      queryClient.invalidateQueries({ queryKey: ['channels'] })
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
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for updating a source.
 */
export function useUpdateSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; sla_minutes?: number | null; is_active?: boolean } }) => {
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
      // Refetch to update inherited SLA values for sub-sources
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
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for adding a sub-source to a source.
 */
export function useAddSubSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sourceId,
      data,
    }: {
      sourceId: string
      data: {
        name: string
        sla_minutes?: number | null
        linked_user?: string | null
        status?: SubSourceStatus
      }
    }) => {
      try {
        return await api.post<SubSource>(`/sources/${sourceId}/add_sub_source/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to add sub-source')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for updating a sub-source.
 */
export function useUpdateSubSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubSource> }) => {
      try {
        return await api.patch<SubSource>(`/sub-sources/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update sub-source')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

/**
 * Hook for deleting a sub-source.
 */
export function useDeleteSubSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/sub-sources/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to delete sub-source')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
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
      return await api.get<MSUser[]>('/sub-sources/ms_users/')
    },
  })
}

/**
 * Source filter option for dropdowns.
 */
export interface SourceFilterOption {
  id: string
  name: string
  sourceName: string
  channelName: string
  isTrusted: boolean
}

interface SubSourceFilterResponse {
  id: string
  name: string
  source_name: string
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
      const response = await api.get<SubSourceFilterResponse[]>('/sub-sources/for_filter/', {
        trust: filter,
      })
      return response.map((item) => ({
        id: item.id,
        name: item.name,
        sourceName: item.source_name,
        channelName: item.channel_name,
        isTrusted: item.is_trusted,
      }))
    },
  })
}
