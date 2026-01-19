/**
 * React Query hooks for WhatsApp messaging.
 * Connects to the Django backend API for YCloud WhatsApp integration.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'

export interface WhatsAppMessage {
  id: string
  client: string
  direction: 'outbound' | 'inbound'
  message_type: 'text' | 'template' | 'image' | 'document'
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  ycloud_message_id: string
  error_message: string
  from_number: string
  to_number: string
  sent_by: string | null
  sent_by_name: string | null
  created_at: string
  sent_at: string | null
  delivered_at: string | null
}

export interface ClientMessagesResponse {
  client_id: string
  client_name: string
  client_phone: string
  messages: WhatsAppMessage[]
  count: number
}

export interface SendMessageResponse {
  success: boolean
  message: WhatsAppMessage
  error?: string
  ycloud_response?: Record<string, unknown>
}

/**
 * Hook for fetching WhatsApp messages for a specific client.
 */
export function useClientWhatsAppMessages(clientId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-messages', clientId],
    queryFn: async (): Promise<ClientMessagesResponse> => {
      return await api.get<ClientMessagesResponse>(`/whatsapp/messages/${clientId}/`)
    },
    enabled: !!clientId,
    refetchInterval: 30000, // Refetch every 30 seconds for new messages
  })
}

/**
 * Hook for sending a WhatsApp message to a client.
 */
export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, message }: { clientId: string; message: string }) => {
      try {
        return await api.post<SendMessageResponse>('/whatsapp/send/', {
          client_id: clientId,
          message,
        })
      } catch (error) {
        if (error instanceof ApiError) {
          const errorData = error.data as { error?: string }
          throw new Error(errorData?.error || 'Failed to send message')
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidate the messages query to refetch
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', variables.clientId] })
    },
  })
}
