/**
 * WebSocket hook for real-time WhatsApp message updates.
 *
 * Connects to Django Channels WebSocket endpoint and updates
 * React Query cache when new messages arrive.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { WhatsAppMessage, ClientMessagesResponse } from './useWhatsApp'

// WebSocket URL - same host as API but on ws:// protocol
const getWebSocketUrl = (clientId: string, token: string) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_WS_HOST || 'localhost:8000'
  return `${protocol}//${host}/ws/whatsapp/${clientId}/?token=${token}`
}

/**
 * Hook for real-time WhatsApp message updates via WebSocket.
 *
 * @param clientId - The client ID to subscribe to
 * @returns WebSocket connection state
 */
export function useWhatsAppWebSocket(clientId: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (!clientId) return

    const token = getAuthToken()
    if (!token) {
      console.warn('No auth token available for WebSocket connection')
      return
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    const wsUrl = getWebSocketUrl(clientId, token)
    console.log('Connecting WebSocket:', wsUrl.replace(/token=.*/, 'token=***'))

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log(`WebSocket connected for client ${clientId}`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('WebSocket message received:', data.type)

        if (data.type === 'new_message') {
          // Update React Query cache with new message
          queryClient.setQueryData<ClientMessagesResponse>(
            ['whatsapp-messages', clientId],
            (old) => {
              if (!old) return old

              // Check for duplicate
              const exists = old.messages.some((m) => m.id === data.message.id)
              if (exists) {
                console.log('Duplicate message ignored')
                return old
              }

              console.log('Adding new message to cache')
              return {
                ...old,
                messages: [...old.messages, data.message as WhatsAppMessage],
                count: old.count + 1,
              }
            }
          )
        } else if (data.type === 'status_update') {
          // Update message status in cache
          queryClient.setQueryData<ClientMessagesResponse>(
            ['whatsapp-messages', clientId],
            (old) => {
              if (!old) return old

              return {
                ...old,
                messages: old.messages.map((m) =>
                  m.id === data.message_id ? { ...m, status: data.status } : m
                ),
              }
            }
          )
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    ws.onclose = (event) => {
      console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`)
      wsRef.current = null

      // Reconnect after 3 seconds (unless intentionally closed)
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting WebSocket reconnect...')
          connect()
        }, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }, [clientId, getAuthToken, queryClient])

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
