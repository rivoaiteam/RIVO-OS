/**
 * Leads Page Component.
 * Displays leads in a table with search, status tabs, and side panel for details.
 * SLA countdown shown under name, not as separate column.
 */

import { useState, useEffect } from 'react'
import { AlertCircle, Loader2, Search, X, Plus } from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { useUrlFilters } from '@/hooks/useUrlState'
import { LeadSidePanel } from '@/components/LeadSidePanel'
import { Pagination } from '@/components/Pagination'
import type { LeadListItem, LeadStatus } from '@/types/mortgage'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_TABS: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'declined', label: 'Declined' },
  { value: 'not_proceeding', label: 'Not Proceeding' },
]

const DEFAULT_FILTERS = {
  status: 'all',
  search: '',
  page: '1',
}

export function LeadsPage() {
  const [statusError, setStatusError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // URL state for filters (enables deep linking)
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS)

  // Sync search input with URL state on mount
  useEffect(() => {
    setSearchInput(filters.search)
  }, []) // Only run once on mount

  // Debounce search input to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        setFilters({ search: searchInput, page: '1' })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search, setFilters])

  const currentPage = parseInt(filters.page, 10) || 1
  const statusFilter = filters.status as LeadStatus | 'all'

  const { data, isLoading, error } = useLeads({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: filters.search,
    status: statusFilter,
  })

  const leads = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const handleRowClick = (lead: LeadListItem) => {
    setSelectedLeadId(lead.id)
  }

  const handleClosePanel = () => {
    setSelectedLeadId(null)
  }

  const handlePageChange = (newPage: number) => {
    setFilters({ page: String(newPage) })
  }

  const handleStatusFilterChange = (newStatus: string) => {
    setFilters({ status: newStatus, page: '1' })
  }

  // Format source display (Channel / Source / Sub-source)
  const getSourceDisplay = (lead: LeadListItem) => {
    if (!lead.sub_source) return '-'
    const parts = [
      lead.sub_source.channel_name,
      lead.sub_source.source_name,
      lead.sub_source.name,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' / ') : '-'
  }

  // Format created date
  const formatCreatedAt = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Format SLA display from lead's sla_display field
  const formatSlaDisplay = (slaDisplay: string | null) => {
    if (!slaDisplay) return { text: 'No SLA', isOverdue: false }
    const isOverdue = slaDisplay.toLowerCase().includes('overdue')
    return { text: slaDisplay, isOverdue }
  }

  if (isLoading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load leads</p>
          <p className="text-sm text-gray-400 mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Page Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Leads</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage and convert incoming leads</p>
          </div>
          <button
            onClick={() => setSelectedLeadId('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Lead
          </button>
        </div>

        {/* Search and Status Tabs */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 border-b border-gray-200">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleStatusFilterChange(tab.value)}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                  statusFilter === tab.value
                    ? 'border-[#1e3a5f] text-[#1e3a5f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Error Toast */}
      {statusError && (
        <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {statusError}
          <button
            onClick={() => setStatusError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Leads Table Card */}
      <div className="mx-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[25%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="w-[18%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="w-[35%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="w-[22%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  onClick={() => handleRowClick(lead)}
                  getSourceDisplay={getSourceDisplay}
                  formatCreatedAt={formatCreatedAt}
                  formatSlaDisplay={formatSlaDisplay}
                />
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            itemLabel="leads"
          />

          {leads.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">No leads found</p>
            </div>
          )}
        </div>
      </div>

      {/* Lead Side Panel */}
      {selectedLeadId && (
        <LeadSidePanel leadId={selectedLeadId} onClose={handleClosePanel} />
      )}
    </div>
  )
}

function LeadRow({
  lead,
  onClick,
  getSourceDisplay,
  formatCreatedAt,
  formatSlaDisplay,
}: {
  lead: LeadListItem
  onClick: () => void
  getSourceDisplay: (lead: LeadListItem) => string
  formatCreatedAt: (dateStr: string) => string
  formatSlaDisplay: (slaDisplay: string | null) => { text: string; isOverdue: boolean }
}) {
  const slaDisplay = formatSlaDisplay(lead.sla_display)

  return (
    <tr
      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <td className="py-3">
        <div>
          <span className="text-xs font-medium text-gray-900 block">{lead.name}</span>
          <span
            className={cn(
              'text-[10px]',
              slaDisplay.isOverdue ? 'text-red-600' : 'text-green-600'
            )}
          >
            {slaDisplay.text}
          </span>
        </div>
      </td>
      <td className="py-3">
        <span className="text-xs text-gray-600">{lead.phone}</span>
      </td>
      <td className="py-3">
        <span className="text-xs text-gray-600 truncate block" title={getSourceDisplay(lead)}>
          {getSourceDisplay(lead)}
        </span>
      </td>
      <td className="py-3">
        <span className="text-xs text-gray-500">{formatCreatedAt(lead.created_at)}</span>
      </td>
    </tr>
  )
}
