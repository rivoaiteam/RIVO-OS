/**
 * Lead Side Panel Component.
 * 50% width slide-in panel from right for viewing/editing lead details.
 */

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { useLead, useUpdateLead, useConvertLeadToClient, useChangeLeadStatus } from '@/hooks/useLeads'
import { ActivityTimeline } from '@/components/activity'
import { SLACountdown } from '@/components/SLACountdown'
import type { LeadStatus } from '@/types/mortgage'
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

  // Handle save
  const handleSave = async () => {
    if (!leadId) return

    try {
      await updateMutation.mutateAsync({
        id: leadId,
        data: {
          name,
          phone,
          email: email || undefined,
          intent: intent || undefined,
        },
      })
      setSaveError(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
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
        <div className="px-6 py-4 flex-shrink-0">
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

          {/* SLA Countdown Section - Near top of panel */}
          {lead && lead.sla_timer && (
            <div className="mt-3 flex flex-wrap gap-3">
              <SLACountdown
                status={lead.sla_timer.is_overdue ? 'overdue' : 'ok'}
                remainingHours={lead.sla_timer.remaining_minutes != null ? lead.sla_timer.remaining_minutes / 60 : null}
                displayText={lead.sla_timer.display}
                label="Lead SLA"
                size="sm"
              />
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

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Name *">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                        />
                      </FormField>
                      <FormField label="Phone *">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                        />
                      </FormField>
                      <FormField label="Email" className="col-span-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Optional"
                          className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                        />
                      </FormField>
                    </div>

                    <FormField label="Intent">
                      <textarea
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        placeholder="Lead's interest or requirements..."
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                      />
                    </FormField>

                    <FormField label="Source">
                      <p className="text-sm text-gray-600">{getSourceDisplay()}</p>
                    </FormField>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <ActivityTimeline recordType="lead" recordId={leadId || ''} />
              )}
            </>
          ) : null}
        </div>

        {/* Footer with Save and Convert buttons */}
        {lead && !lead.converted_client && activeTab === 'details' && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 space-y-2">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            {lead.status === 'active' && (
              <button
                onClick={handleConvert}
                disabled={convertMutation.isPending}
                className="w-full py-2.5 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            )}
          </div>
        )}
      </div>
    </>
  )
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
