/**
 * WhatsApp tab for Lead side panel.
 */

import { useEffect } from 'react'
import { useLeadWhatsAppMessages, useSendLeadWhatsAppMessage } from '@/hooks/useLeadWhatsApp'
import { WhatsAppChat } from './WhatsAppChat'

interface LeadInfo {
  name?: string
  phone?: string
  email?: string
}

interface LeadWhatsAppTabProps {
  leadId: string
  leadInfo?: LeadInfo
  onError?: (error: string | null) => void
}

export function LeadWhatsAppTab({ leadId, leadInfo, onError }: LeadWhatsAppTabProps) {
  const { data, isLoading, error } = useLeadWhatsAppMessages(leadId)
  const sendMutation = useSendLeadWhatsAppMessage()

  const currentError = error ? (error as Error).message : sendMutation.error ? (sendMutation.error as Error).message : null

  // Report error to parent
  useEffect(() => {
    onError?.(currentError)
  }, [currentError, onError])

  const handleSend = async (message: string) => {
    await sendMutation.mutateAsync({ leadId, message })
  }

  return (
    <WhatsAppChat
      messages={data?.messages || []}
      isLoading={isLoading}
      isSending={sendMutation.isPending}
      onSend={handleSend}
      clientInfo={leadInfo}
    />
  )
}
