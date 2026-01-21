/**
 * Lead Side Panel Component.
 * 50% width slide-in panel from right for viewing/editing lead details.
 * Includes tabs for Details and WhatsApp chat.
 */

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, UserPlus, Tag, MessageCircle, ArrowRight, Clock } from 'lucide-react'
import { useLead, useUpdateLead, useConvertLeadToClient, useChangeLeadStatus } from '@/hooks/useLeads'
import { useLeadJourney, useLeadWebSocket } from '@/hooks/useLeadCampaign'
import { SLACountdown } from '@/components/SLACountdown'
import { LeadWhatsAppTab } from '@/components/whatsapp/LeadWhatsAppTab'
import type { LeadStatus, CampaignStatus } from '@/types/mortgage'
import { CAMPAIGN_STATUS_LABELS, LEAD_INTERACTION_TYPE_LABELS } from '@/types/mortgage'
import { cn } from '@/lib/utils'

type TabType = 'details' | 'whatsapp'

const statusColors: Record<LeadStatus, string> = {
  active: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

// Campaign status badge colors
const campaignStatusColors: Record<CampaignStatus, string> = {
  subscriber_pending: 'bg-gray-100 text-gray-700',
  segment_mortgaged: 'bg-blue-100 text-blue-700',
  segment_renting: 'bg-purple-100 text-purple-700',
  segment_other: 'bg-gray-100 text-gray-600',
  locale_dubai: 'bg-amber-100 text-amber-700',
  locale_abudhabi: 'bg-orange-100 text-orange-700',
  locale_other: 'bg-gray-100 text-gray-600',
  qualified: 'bg-green-100 text-green-700',
  disqualified: 'bg-red-100 text-red-700',
  converted: 'bg-emerald-100 text-emerald-700',
}

interface LeadSidePanelProps {
  leadId: string | null
  onClose: () => void
}

export function LeadSidePanel({ leadId, onClose }: LeadSidePanelProps) {
  const { data: lead, isLoading, error } = useLead(leadId || '')
  const { data: journey, isLoading: journeyLoading } = useLeadJourney(leadId)
  const updateMutation = useUpdateLead()
  const convertMutation = useConvertLeadToClient()
  const changeStatusMutation = useChangeLeadStatus()

  // WebSocket for real-time updates
  useLeadWebSocket(leadId)

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
          {lead && (
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
                onClick={() => setActiveTab('whatsapp')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
                  activeTab === 'whatsapp'
                    ? 'text-[#1e3a5f] border-[#1e3a5f]'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          )}

        </div>

        {/* Details Tab Content */}
        {activeTab === 'details' && (
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
            <div className="space-y-4">
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

              {/* Campaign Tracking Section */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Campaign Tracking
                </h3>

                {/* Campaign Status Badge */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-gray-500">Status:</span>
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                    campaignStatusColors[lead.campaign_status] || 'bg-gray-100 text-gray-600'
                  )}>
                    {CAMPAIGN_STATUS_LABELS[lead.campaign_status] || lead.campaign_status}
                  </span>
                </div>

                {/* Campaign Enrollments */}
                {journey?.campaign_enrollments && journey.campaign_enrollments.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 block mb-1.5">Enrolled Campaigns:</span>
                    <div className="space-y-2">
                      {journey.campaign_enrollments.map((enrollment) => (
                        <div
                          key={enrollment.id}
                          className="p-2 bg-gray-50 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">
                              {enrollment.campaign_name}
                            </span>
                            <span className={cn(
                              'px-1.5 py-0.5 text-[10px] rounded font-medium',
                              enrollment.status === 'completed' && 'bg-green-100 text-green-700',
                              enrollment.status === 'progressing' && 'bg-blue-100 text-blue-700',
                              enrollment.status === 'enrolled' && 'bg-gray-100 text-gray-600',
                              enrollment.status === 'stalled' && 'bg-yellow-100 text-yellow-700',
                              enrollment.status === 'dropped' && 'bg-red-100 text-red-700',
                            )}>
                              {enrollment.status}
                            </span>
                          </div>
                          {enrollment.current_step && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              Step {enrollment.current_step.order}: {enrollment.current_step.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Tags */}
                {lead.current_tags && lead.current_tags.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 block mb-1.5">Tags:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.current_tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{lead.response_count} responses</span>
                  </div>
                  {lead.first_response_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>First: {formatDate(lead.first_response_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Journey Timeline */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Journey Timeline
                </h3>

                {journeyLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : journey?.journey && journey.journey.length > 0 ? (
                  <div className="space-y-3">
                    {journey.journey.map((item, index) => (
                      <JourneyTimelineItem
                        key={`${item.type}-${index}`}
                        item={item}
                        isLast={index === journey.journey.length - 1}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No journey events yet
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
        )}

        {/* WhatsApp Tab Content */}
        {activeTab === 'whatsapp' && lead && (
          <div className="flex-1 overflow-y-auto p-6">
            <LeadWhatsAppTab
              leadId={leadId!}
              leadPhone={lead.phone}
              leadName={lead.name}
            />
          </div>
        )}

        {/* Footer with Save and Convert buttons - Only show on details tab */}
        {activeTab === 'details' && lead && !lead.converted_client && (
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

// Format date helper
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Format date/time for timeline
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Journey item type from API
interface JourneyItem {
  type: 'interaction' | 'message'
  interaction_type?: string
  content: string
  tag_value?: string
  template_name?: string
  created_at: string
  metadata?: Record<string, unknown>
  direction?: string
  message_type?: string
  status?: string
  button_payload?: string
}

// Journey Timeline Item Component
function JourneyTimelineItem({
  item,
  isLast,
}: {
  item: JourneyItem
  isLast: boolean
}) {
  const getIcon = () => {
    if (item.type === 'message') {
      if (item.direction === 'outbound') {
        return <ArrowRight className="h-3 w-3 text-blue-500" />
      }
      return <MessageCircle className="h-3 w-3 text-green-500" />
    }

    // Interaction types
    switch (item.interaction_type) {
      case 'template_sent':
        return <ArrowRight className="h-3 w-3 text-blue-500" />
      case 'button_click':
        return <MessageCircle className="h-3 w-3 text-green-500" />
      case 'text_reply':
        return <MessageCircle className="h-3 w-3 text-emerald-500" />
      case 'tag_added':
        return <Tag className="h-3 w-3 text-purple-500" />
      case 'tag_removed':
        return <Tag className="h-3 w-3 text-gray-400" />
      case 'status_change':
        return <ArrowRight className="h-3 w-3 text-orange-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  const getDescription = () => {
    if (item.type === 'message') {
      const direction = item.direction === 'outbound' ? 'Sent' : 'Received'
      const truncated = item.content?.substring(0, 50) || ''
      const ellipsis = item.content && item.content.length > 50 ? '...' : ''
      return `${direction}: "${truncated}${ellipsis}"`
    }

    // Interaction descriptions
    switch (item.interaction_type) {
      case 'template_sent':
        return `Template sent: ${item.template_name || 'Unknown'}`
      case 'button_click':
        return `Button click: ${item.content || 'Unknown'}`
      case 'text_reply':
        return `Text reply: "${item.content?.substring(0, 50)}${item.content && item.content.length > 50 ? '...' : ''}"`
      case 'tag_added':
        return `Tag added: ${item.tag_value}`
      case 'tag_removed':
        return `Tag removed: ${item.tag_value}`
      case 'status_change':
        return `Status changed: ${item.content}`
      default:
        return LEAD_INTERACTION_TYPE_LABELS[item.interaction_type as keyof typeof LEAD_INTERACTION_TYPE_LABELS] || item.interaction_type || 'Unknown event'
    }
  }

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
          {getIcon()}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3">
        <p className="text-xs text-gray-700">{getDescription()}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {formatDateTime(item.created_at)}
        </p>
      </div>
    </div>
  )
}
