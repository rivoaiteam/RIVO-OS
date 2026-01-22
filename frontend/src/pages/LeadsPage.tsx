/**
 * Leads Page Component.
 * Displays leads in a table with search, status tabs, and side panel for details.
 */

import { useState, useCallback } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useSourcesForFilter } from '@/hooks/useChannels'
import { useCampaignDashboardWebSocket } from '@/hooks/useLeadCampaign'
import { useUrlFilters } from '@/hooks/useUrlState'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { LeadSidePanel } from '@/components/LeadSidePanel'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
  PageLoading,
  PageError,
  PageHeader,
  StatusTabs,
  SearchInput,
} from '@/components/ui/TablePageLayout'
import { formatDate, formatTimeAgo } from '@/lib/formatters'
import type { LeadListItem, LeadStatus, CampaignStatus } from '@/types/mortgage'
import { CAMPAIGN_STATUS_LABELS } from '@/types/mortgage'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'active' as const, label: 'Active' },
  { value: 'declined' as const, label: 'Declined' },
]

// Campaign status filter tabs
const CAMPAIGN_TABS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Campaign' },
  { value: 'subscriber_pending', label: 'Pending' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'converted', label: 'Converted' },
]

const DEFAULT_FILTERS = {
  status: 'all',
  campaign_status: 'all',
  search: '',
  page: '1',
  source: '',
}

// Campaign status badge colors
const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
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

export function LeadsPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS)

  // WebSocket for real-time campaign updates
  useCampaignDashboardWebSocket()

  const handleSearchChange = useCallback((value: string) => {
    setFilters({ search: value, page: '1' })
  }, [setFilters])

  const { inputValue, setInputValue } = useDebouncedSearch({
    initialValue: filters.search,
    onSearch: handleSearchChange,
  })

  const currentPage = parseInt(filters.page, 10) || 1
  const statusFilter = filters.status as LeadStatus | 'all'
  const campaignStatusFilter = filters.campaign_status as CampaignStatus | 'all'
  const sourceFilter = filters.source || ''

  const { data: sources } = useSourcesForFilter('untrusted')

  const { data, isLoading, error } = useLeads({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: filters.search,
    status: statusFilter,
    sub_source_id: sourceFilter || undefined,
    campaign_status: campaignStatusFilter,
  })

  const leads = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const getSourceDisplay = (lead: LeadListItem) => {
    if (!lead.sub_source) return '-'
    const { name, source_name } = lead.sub_source
    return name && source_name ? `${name} (${source_name})` : name || source_name || '-'
  }

  const getSlaDisplay = (slaDisplay: string | null) => {
    if (!slaDisplay) return null
    const lower = slaDisplay.toLowerCase()
    if (lower === 'completed') return null // Don't show completed SLA
    if (lower.includes('overdue')) return { text: slaDisplay, status: 'overdue' as const }
    return { text: slaDisplay, status: 'remaining' as const }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError entityName="leads" message={error.message} />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader title="Leads" subtitle="Manage and convert incoming leads" />

        <div className="flex items-center gap-4 mt-4">
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            placeholder="Search leads..."
          />
          <StatusTabs
            tabs={STATUS_TABS}
            value={statusFilter}
            onChange={(value) => setFilters({ status: value, page: '1' })}
          />
          <select
            value={sourceFilter}
            onChange={(e) => setFilters({ source: e.target.value, page: '1' })}
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white min-w-[140px]"
          >
            <option value="">All Sources</option>
            {sources?.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} ({source.sourceName})
              </option>
            ))}
          </select>
          {/* Campaign Status Filter */}
          <div className="flex items-center gap-1 border-b border-gray-200 ml-4">
            {CAMPAIGN_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilters({ campaign_status: tab.value, page: '1' })}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                  campaignStatusFilter === tab.value
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TableCard>
        <TableContainer isEmpty={leads.length === 0} emptyMessage="No leads found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[22%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[22%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                <th className="w-[18%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Campaign Status</th>
                <th className="w-[19%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="w-[19%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const sla = getSlaDisplay(lead.sla_display)
                const campaignStatusColor = CAMPAIGN_STATUS_COLORS[lead.campaign_status] || 'bg-gray-100 text-gray-600'
                const campaignStatusLabel = CAMPAIGN_STATUS_LABELS[lead.campaign_status] || lead.campaign_status
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3">
                      <div>
                        <span className="text-xs font-medium text-gray-900 block">{lead.name}</span>
                        {sla && (
                          <span className={cn(
                            'text-[10px]',
                            sla.status === 'overdue' ? 'text-red-600' : 'text-gray-500'
                          )}>
                            {sla.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-600 truncate block" title={getSourceDisplay(lead)}>
                        {getSourceDisplay(lead)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                        campaignStatusColor
                      )}>
                        {campaignStatusLabel}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500">{formatDate(lead.created_at)}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-gray-500">{formatTimeAgo(lead.updated_at)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TableContainer>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={(page) => setFilters({ page: String(page) })}
          itemLabel="leads"
        />
      </TableCard>

      {selectedLeadId && (
        <LeadSidePanel leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </TablePageLayout>
  )
}
