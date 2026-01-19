/**
 * ClientsPage - List and manage mortgage clients.
 * Features search, filtering, pagination, and side panel for details.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Search,
  AlertCircle,
  Loader2,
  X,
  Trash2,
  Briefcase,
} from 'lucide-react'
import { useClients, useDeleteClient } from '@/hooks/useClients'
import { useBanks } from '@/hooks/useCases'
import { useAuth } from '@/contexts/AuthContext'
import type {
  ClientListItem,
  ClientStatus,
  ClientCaseSummary,
} from '@/types/mortgage'
import { CASE_STAGE_LABELS } from '@/types/mortgage'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { Pagination } from '@/components/Pagination'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_TABS: { value: ClientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'declined', label: 'Declined' },
  { value: 'not_proceeding', label: 'Not Proceeding' },
]

function CaseDropdown({ cases, onSelect, banks }: {
  cases: ClientCaseSummary[]
  onSelect: (caseId: string) => void
  banks: Array<{ id: string; name: string; icon: string }> | undefined
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Single case - just open directly
  if (cases.length === 1) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSelect(cases[0].id)
        }}
        className="p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors"
        title="View case"
      >
        <Briefcase className="h-3.5 w-3.5" />
      </button>
    )
  }

  // Multiple cases - dropdown on click
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors"
        title="View cases"
      >
        <Briefcase className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="fixed z-50 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().right - 224 : 0,
          }}
        >
          <div className="py-1 max-h-48 overflow-y-auto">
            {cases.map((c) => {
              const bankData = banks?.find(b => b.name === c.bank)
              return (
                <button
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(c.id)
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  {bankData?.icon && (
                    <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src={bankData.icon}
                        alt=""
                        className="h-4 w-4 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900">{c.bank}</div>
                    <div className="text-[10px] text-gray-500">
                      {CASE_STAGE_LABELS[c.stage]} • AED {parseFloat(c.loan_amount).toLocaleString()}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function ClientsPage() {
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const [statusError, setStatusError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  const { data: banks } = useBanks()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, error } = useClients({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: searchQuery,
    status: statusFilter,
  })

  const clients = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const handleRowClick = (client: ClientListItem) => {
    setSelectedClientId(client.id)
  }

  const closeSidePanel = () => {
    setSelectedClientId(null)
  }

  const deleteMutation = useDeleteClient()

  const handleDelete = async (client: ClientListItem) => {
    if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      try {
        await deleteMutation.mutateAsync(client.id)
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : 'Failed to delete client')
      }
    }
  }

  // DBR color coding based on AED value (dbr_available from API is a string)
  const getDbrColor = (dbrString: string | null) => {
    if (!dbrString) return 'text-gray-500'
    const dbr = parseFloat(dbrString)
    if (isNaN(dbr)) return 'text-gray-500'
    if (dbr >= 5000) return 'text-green-600' // Good: 5000+ AED available
    if (dbr >= 1000) return 'text-amber-600' // Marginal: 1000-5000 AED available
    return 'text-red-600' // Negative/low: <1000 AED available
  }

  const formatDbr = (dbrString: string | null) => {
    if (!dbrString) return '-'
    const dbr = parseFloat(dbrString)
    if (isNaN(dbr)) return '-'
    return `AED ${dbr.toLocaleString()}`
  }

  // Format time ago for last activity
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
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
          <p className="text-gray-600">Failed to load clients</p>
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
            <h1 className="text-sm font-semibold text-gray-900">Clients</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage mortgage applicants and their eligibility</p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setSelectedClientId('new')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Client
            </button>
          )}
        </div>

        {/* Search and Status Tabs */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 border-b border-gray-200">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setCurrentPage(1) }}
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

      {/* Clients Table Card */}
      <div className="mx-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[22%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[20%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">DBR</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Activity</th>
                <th className="w-[16%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => handleRowClick(client)}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    <div>
                      <span className="text-xs font-medium text-gray-900 block">{client.name}</span>
                      {client.sla_display && (
                        <span className={cn(
                          'text-[10px]',
                          client.sla_display.toLowerCase().includes('overdue') ? 'text-red-600' : 'text-green-600'
                        )}>
                          {client.sla_display}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500 truncate block max-w-[180px]">
                      {client.sub_source ? `${client.sub_source.name} (${client.sub_source.source_name})` : '-'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={cn('text-xs font-medium', getDbrColor(client.dbr_available))}>
                      {formatDbr(client.dbr_available)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">
                      {new Date(client.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(client.updated_at)}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      {client.active_case_id && client.active_case_id.length > 0 && (
                        <CaseDropdown
                          cases={client.active_case_id}
                          onSelect={(caseId) => setSelectedCaseId(caseId)}
                          banks={banks}
                        />
                      )}
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(client)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            itemLabel="clients"
          />

          {clients.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">No clients found</p>
            </div>
          )}
        </div>
      </div>

      {/* Client Side Panel */}
      {selectedClientId && (
        <ClientSidePanel
          clientId={selectedClientId}
          onClose={closeSidePanel}
        />
      )}

      {/* Case Side Panel */}
      {selectedCaseId && (
        <CaseSidePanel
          caseId={selectedCaseId}
          isOpen={!!selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
        />
      )}
    </div>
  )
}
