/**
 * WhatsApp chat tab component for the Lead side panel.
 * Displays message history and allows sending new messages via YCloud.
 */

import { useState, useRef, useEffect } from 'react'
import { Send, MessageCircle, AlertCircle, CheckCheck, Check, Clock, FileText } from 'lucide-react'
import { useLeadWhatsAppMessages, useSendLeadWhatsAppMessage, type LeadWhatsAppMessage } from '@/hooks/useLeadWhatsApp'
import { useLeadWhatsAppWebSocket } from '@/hooks/useLeadWhatsAppWebSocket'
import { TemplateSelector } from './TemplateSelector'
import { cn } from '@/lib/utils'

interface LeadWhatsAppTabProps {
  leadId: string
  leadPhone?: string
  leadName?: string
}

function MessageBubble({ message }: { message: LeadWhatsAppMessage }) {
  const isOutbound = message.direction === 'outbound'

  const getStatusIcon = () => {
    switch (message.status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-400" />
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Show template name or button payload if present
  const displayContent = message.content || message.button_payload || '[No content]'

  return (
    <div
      className={cn(
        'flex',
        isOutbound ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
          isOutbound
            ? 'bg-[#1e3a5f] text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        )}
      >
        {message.template_name && (
          <p className={cn(
            'text-xs mb-1',
            isOutbound ? 'text-white/60' : 'text-gray-500'
          )}>
            Template: {message.template_name}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
        {message.button_payload && message.content !== message.button_payload && (
          <p className={cn(
            'text-xs mt-1 italic',
            isOutbound ? 'text-white/60' : 'text-gray-500'
          )}>
            Button: {message.button_payload}
          </p>
        )}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOutbound ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'text-xs',
              isOutbound ? 'text-white/70' : 'text-gray-500'
            )}
          >
            {formatTime(message.created_at)}
          </span>
          {isOutbound && getStatusIcon()}
        </div>
        {message.status === 'failed' && message.error_message && (
          <p className="text-xs text-red-300 mt-1">{message.error_message}</p>
        )}
      </div>
    </div>
  )
}

export function LeadWhatsAppTab({ leadId, leadPhone, leadName }: LeadWhatsAppTabProps) {
  const [newMessage, setNewMessage] = useState('')
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading, error } = useLeadWhatsAppMessages(leadId)
  const sendMessage = useSendLeadWhatsAppMessage()

  // Connect to WebSocket for real-time message updates
  useLeadWhatsAppWebSocket(leadId)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages])

  const handleSend = async () => {
    if (!newMessage.trim() || sendMessage.isPending) return

    try {
      await sendMessage.mutateAsync({
        leadId,
        message: newMessage.trim(),
      })
      setNewMessage('')
      inputRef.current?.focus()
    } catch (error) {
      // Error is handled by the mutation
      console.error('Failed to send message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTemplateSelect = (content: string) => {
    setNewMessage(content)
    inputRef.current?.focus()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a5f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">Failed to load messages</p>
        <p className="text-xs text-gray-500">{(error as Error).message}</p>
      </div>
    )
  }

  const phoneNumber = data?.lead_phone || leadPhone || 'Unknown'
  const name = data?.lead_name || leadName || 'Lead'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">WhatsApp - {name}</h3>
          <p className="text-sm text-gray-500">{phoneNumber}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[300px]">
        {data?.messages && data.messages.length > 0 ? (
          <>
            {data.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Send a message to start the conversation</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowTemplateSelector(true)}
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-full',
              'border border-gray-200 text-gray-500',
              'hover:bg-gray-50 hover:text-[#1e3a5f] hover:border-[#1e3a5f] transition-colors'
            )}
            title="Use Template"
          >
            <FileText className="w-4 h-4" />
          </button>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3',
              'text-sm placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]',
              'max-h-32'
            )}
            style={{
              minHeight: '44px',
              height: newMessage.split('\n').length > 1 ? 'auto' : '44px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-full',
              'bg-[#1e3a5f] text-white',
              'hover:bg-[#2a4a6f] transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {sendMessage.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {sendMessage.isError && (
          <p className="text-xs text-red-500 mt-2">
            {(sendMessage.error as Error).message}
          </p>
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          client={{ phone: leadPhone }}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  )
}
