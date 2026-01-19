/**
 * Lead Side Panel Component.
 * 50% width slide-in panel from right for viewing/editing lead details.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { useLead, useUpdateLead, useConvertLeadToClient, useChangeLeadStatus } from '@/hooks/useLeads'
import { ActivityTimeline } from '@/components/activity'
import type { LeadStatus, LeadData } from '@/types/mortgage'
import { cn } from '@/lib/utils'

type TabType = 'details' | 'activity'

const statusColors: Record<LeadStatus, string> = {
  active: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

interface LeadSidePanelProps {
  leadId: string | null
  onClose: () => void
}

export function LeadSidePanel({ leadId, onClose }: LeadSidePanelProps) {
  const { data: lead, isLoading, error } = useLead(leadId || '')
  const updateMutation = useUpdateLead()
  const convertMutation = useConvertLeadToClient()
  const changeStatusMutation = useChangeLeadStatus()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('details')

  // Local form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [intent, setIntent] = useState('')
  const [status, setStatus] = useState<LeadStatus>('active')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Debounce timer refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingUpdateRef = useRef<Record<string, string | undefined>>({})

  // Sync form state when lead data changes
  useEffect(() => {
    if (lead) {
      setName(lead.name)
      setPhone(lead.phone)
      setEmail(lead.email || '')
      setIntent(lead.intent || '')
      setStatus(lead.status)
    }
  }, [lead])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Debounced save function
  const debouncedSave = useCallback(
    (field: string, value: string | undefined) => {
      if (!leadId) return

      // Accumulate pending updates
      pendingUpdateRef.current[field] = value

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(async () => {
        const updates = { ...pendingUpdateRef.current }
        pendingUpdateRef.current = {}

        try {
          await updateMutation.mutateAsync({ id: leadId, data: updates })
          setSaveError(null)
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : 'Failed to save')
        }
      }, 500)
    },
    [leadId, updateMutation]
  )

  // Handle field blur for auto-save
  const handleFieldBlur = (field: keyof LeadData, value: string) => {
    if (!lead) return

    const originalValue = (lead[field] as string | null) || ''
    if (value !== originalValue) {
      debouncedSave(field, value || undefined)
    }
  }

  // Handle status change (immediate save via change_status endpoint)
  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!leadId || !lead) return

    setStatus(newStatus)

    try {
      await changeStatusMutation.mutateAsync({ id: leadId, status: newStatus })
      setSaveError(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update status')
      setStatus(lead.status) // Revert on error
    }
  }

  // Handle convert to client
  const handleConvert = async () => {
    if (!leadId) return

    try {
      await convertMutation.mutateAsync(leadId)
      setSaveError(null)
      // The lead status will be updated to 'converted' by the backend
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to convert lead')
    }
  }

  // Format channel/source display
  const getSourceDisplay = () => {
    if (!lead?.sub_source) return '-'

    const parts = [
      lead.sub_source.channel_name,
      lead.sub_source.source_name,
      lead.sub_source.name,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' / ') : '-'
  }

  // Format created at date
  const formatCreatedAt = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!leadId) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 w-1/2 bg-white z-50 shadow-xl flex flex-col transform transition-transform duration-200 ease-in-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-panel-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 id="lead-panel-title" className="text-lg font-semibold text-gray-900">
                {lead?.name || 'Lead Details'}
              </h2>
              {lead && (
                lead.converted_client ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-700">
                    Converted
                  </span>
                ) : (
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                    disabled={changeStatusMutation.isPending}
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded border-0 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                      statusColors[status]
                    )}
                  >
                    <option value="active">Active</option>
                    <option value="declined">Declined</option>
                  </select>
                )
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SLA Display - Near top of panel */}
          {lead && lead.sla_timer && (
            <div className="mt-3">
              <div className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium',
                lead.sla_timer.is_overdue
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              )}>
                <span className="text-gray-500">SLA:</span>
                <span>{lead.sla_timer.display || 'No SLA'}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex mt-4 -mb-px">
            <button
              onClick={() => setActiveTab('details')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'details'
                  ? 'text-[#1e3a5f] border-[#1e3a5f]'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'activity'
                  ? 'text-[#1e3a5f] border-[#1e3a5f]'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Activity
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-sm text-gray-600">Failed to load lead</p>
              <p className="text-xs text-gray-400 mt-1">{error.message}</p>
            </div>
          ) : lead ? (
            <>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Save Error Toast */}
                  {saveError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {saveError}
                      <button
                        onClick={() => setSaveError(null)}
                        className="ml-auto text-red-400 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Editable Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => handleFieldBlur('name', name)}
                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={() => handleFieldBlur('phone', phone)}
                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => handleFieldBlur('email', email)}
                        placeholder="Optional"
                        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Intent</label>
                      <textarea
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        onBlur={() => handleFieldBlur('intent', intent)}
                        placeholder="Lead's interest or requirements..."
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                      />
                    </div>
                  </div>

                  {/* Read-only Fields */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Channel / Source / Sub-source
                      </label>
                      <p className="text-sm text-gray-600">{getSourceDisplay()}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Created At</label>
                      <p className="text-sm text-gray-600">{formatCreatedAt(lead.created_at)}</p>
                    </div>
                  </div>

                  {/* Convert to Client Button */}
                  {lead.status === 'active' && !lead.converted_client && (
                    <div className="pt-4 border-t border-gray-100">
                      <button
                        onClick={handleConvert}
                        disabled={convertMutation.isPending}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#0f2744] transition-colors disabled:opacity-50"
                      >
                        {convertMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Convert to Client
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <ActivityTimeline recordType="lead" recordId={leadId || ''} />
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
