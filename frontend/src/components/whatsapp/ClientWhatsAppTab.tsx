/**
 * WhatsApp tab for Client side panel.
 */

import { useEffect } from 'react'
import { useClientWhatsAppMessages, useSendWhatsAppMessage } from '@/hooks/useWhatsApp'
import { WhatsAppChat } from './WhatsAppChat'
import type { ClientData } from '@/types/mortgage'

interface ClientWhatsAppTabProps {
  clientId: string
  clientPhone?: string
  client?: Partial<ClientData> | null
  onError?: (error: string | null) => void
}

export function ClientWhatsAppTab({ clientId, client, onError }: ClientWhatsAppTabProps) {
  const { data, isLoading, error } = useClientWhatsAppMessages(clientId)
  const sendMutation = useSendWhatsAppMessage()

  const currentError = error ? (error as Error).message : sendMutation.error ? (sendMutation.error as Error).message : null

  // Report error to parent
  useEffect(() => {
    onError?.(currentError)
  }, [currentError, onError])

  const handleSend = async (message: string) => {
    await sendMutation.mutateAsync({ clientId, message })
  }

  // Extract client info for template filling
  const clientInfo = client ? {
    name: client.name,
    phone: client.phone,
    email: client.email || undefined,
  } : undefined

  return (
    <WhatsAppChat
      messages={data?.messages || []}
      isLoading={isLoading}
      isSending={sendMutation.isPending}
      onSend={handleSend}
      clientInfo={clientInfo}
    />
  )
}
