/**
 * React Query hooks for Message Templates API.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export interface MessageTemplate {
  id: string
  name: string
  category: string
  category_display: string
  content: string
  is_active: boolean
  created_by: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface TemplateCategory {
  value: string
  label: string
}

export interface TemplateVariable {
  name: string
  description: string
}

export interface MessageTemplatesResponse {
  count: number
  next: string | null
  previous: string | null
  results: MessageTemplate[]
}

interface CreateTemplateData {
  name: string
  category: string
  content: string
  is_active?: boolean
}

interface UpdateTemplateData {
  name?: string
  category?: string
  content?: string
  is_active?: boolean
}

/**
 * Hook for fetching all message templates.
 */
export function useMessageTemplates(params?: { search?: string; category?: string }) {
  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.set('search', params.search)
  if (params?.category) queryParams.set('category', params.category)

  const queryString = queryParams.toString()
  const url = `/message-templates/${queryString ? `?${queryString}` : ''}`

  return useQuery({
    queryKey: ['message-templates', params?.search, params?.category],
    queryFn: async (): Promise<MessageTemplate[]> => {
      const response = await api.get<MessageTemplatesResponse>(url)
      return response.results
    },
  })
}

/**
 * Hook for fetching a single message template.
 */
export function useMessageTemplate(id: string | null) {
  return useQuery({
    queryKey: ['message-template', id],
    queryFn: async (): Promise<MessageTemplate> => {
      return await api.get<MessageTemplate>(`/message-templates/${id}/`)
    },
    enabled: !!id,
  })
}

/**
 * Hook for fetching template categories.
 */
export function useTemplateCategories() {
  return useQuery({
    queryKey: ['template-categories'],
    queryFn: async (): Promise<TemplateCategory[]> => {
      return await api.get<TemplateCategory[]>('/message-templates/categories/')
    },
    staleTime: Infinity, // Categories don't change often
  })
}

/**
 * Hook for fetching available template variables.
 */
export function useTemplateVariables() {
  return useQuery({
    queryKey: ['template-variables'],
    queryFn: async (): Promise<TemplateVariable[]> => {
      return await api.get<TemplateVariable[]>('/message-templates/variables/')
    },
    staleTime: Infinity, // Variables don't change often
  })
}

/**
 * Hook for creating a new message template.
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      try {
        return await api.post<MessageTemplate>('/message-templates/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { detail?: string })?.detail || 'Failed to create template')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['message-templates'] })
    },
  })
}

/**
 * Hook for updating a message template.
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateData }) => {
      try {
        return await api.patch<MessageTemplate>(`/message-templates/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { detail?: string })?.detail || 'Failed to update template')
        }
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.refetchQueries({ queryKey: ['message-templates'] })
      queryClient.refetchQueries({ queryKey: ['message-template', variables.id] })
    },
  })
}

/**
 * Hook for deleting a message template.
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/message-templates/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { detail?: string })?.detail || 'Failed to delete template')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['message-templates'] })
    },
  })
}
