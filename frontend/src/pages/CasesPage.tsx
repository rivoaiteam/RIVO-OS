/**
 * CasesPage - Displays a paginated table of mortgage cases with filtering.
 * Follows the design patterns from UsersPage.tsx.
 * Supports URL state for filters to enable deep linking.
 */

import { useState, useEffect, useRef } from 'react'
import { Plus, AlertCircle, Loader2, Search, Trash2, ChevronDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCases,
  useBanks,
  useDeleteCase,
  CASE_STAGES,
  getStageLabel,
} from '@/hooks/useCases'
import { useUrlFilters } from '@/hooks/useUrlState'
import type { CaseStage, CaseListItem } from '@/types/mortgage'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { Pagination } from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'

const stageColors: Record<CaseStage, string> = {
  // Active stages - blue variants
  processing: 'bg-blue-50 text-blue-700',
  document_collection: 'bg-blue-100 text-blue-700',
  bank_submission: 'bg-blue-100 text-blue-800',
  bank_processing: 'bg-blue-200 text-blue-800',
  offer_issued: 'bg-indigo-100 text-indigo-700',
  offer_accepted: 'bg-indigo-200 text-indigo-800',
  property_valuation: 'bg-violet-100 text-violet-700',
  final_approval: 'bg-violet-200 text-violet-800',
  property_transfer: 'bg-purple-100 text-purple-700',
  // Hold stage - amber
  on_hold: 'bg-amber-100 text-amber-700',
  // Terminal stages
  property_transferred: 'bg-green-100 text-green-700',
  declined: 'bg-gray-200 text-gray-500',
  not_proceeding: 'bg-gray-200 text-gray-500',
}

const PAGE_SIZE = 10

interface BankFilterDropdownProps {
  value: string
  onChange: (value: string) => void
  banks: Array<{ id: string; name: string; icon: string }> | undefined
}

function BankFilterDropdown({ value, onChange, banks }: BankFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedBank = banks?.find(b => b.id === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 text-xs border border-gray-200 rounded-lg bg-white flex items-center gap-2 min-w-[140px]"
      >
        {selectedBank ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={selectedBank.icon}
                alt=""
                className="h-3 w-3 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <span className="text-gray-700 truncate max-w-[80px]">{selectedBank.name}</span>
          </span>
        ) : (
          <span className="text-gray-500">All Banks</span>
        )}
        <ChevronDown className={cn('h-3 w-3 text-gray-400 ml-auto transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-30 w-56 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setIsOpen(false) }}
            className={cn(
              'w-full px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors',
              !value && 'bg-blue-50'
            )}
          >
            <span className="text-gray-700">All Banks</span>
          </button>
          {banks?.map(bank => (
            <button
              key={bank.id}
              type="button"
              onClick={() => { onChange(bank.id); setIsOpen(false) }}
              className={cn(
                'w-full px-3 py-2 text-xs text-left flex items-center gap-2 hover:bg-gray-50 transition-colors',
                value === bank.id && 'bg-blue-50'
              )}
            >
              <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src={bank.icon}
                  alt=""
                  className="h-4 w-4 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <span className="text-gray-700">{bank.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const DEFAULT_FILTERS = {
  stage: 'all',
  bank: '',
  search: '',
  page: '1',
}

export function CasesPage() {
  const { user } = useAuth()
  const isReadOnly = user?.role === 'manager'
  const [searchInput, setSearchInput] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const deleteMutation = useDeleteCase()

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
  const stageFilter = filters.stage as CaseStage | 'all'
  const bankFilter = filters.bank

  const { data, isLoading, error } = useCases({
    page: currentPage,
    page_size: PAGE_SIZE,
    search: filters.search,
    stage: stageFilter,
    bank: bankFilter || undefined,
  })

  const { data: banks } = useBanks()

  const cases = data?.items || []
  const totalItems = data?.total || 0
  const totalPages = data?.total_pages || 1

  const handleRowClick = (caseItem: CaseListItem) => {
    setSelectedCaseId(caseItem.id)
    setSidePanelOpen(true)
  }

  const handleCloseSidePanel = () => {
    setSidePanelOpen(false)
    setSelectedCaseId(null)
  }

  const handlePageChange = (newPage: number) => {
    setFilters({ page: String(newPage) })
  }

  const handleStageFilterChange = (newStage: string) => {
    setFilters({ stage: newStage, page: '1' })
  }

  const handleBankFilterChange = (newBank: string) => {
    setFilters({ bank: newBank, page: '1' })
  }

  const handleDelete = async (caseItem: CaseListItem) => {
    if (window.confirm(`Are you sure you want to delete this case?`)) {
      try {
        await deleteMutation.mutateAsync(caseItem.id)
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : 'Failed to delete case')
      }
    }
  }

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value) || 0
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      maximumFractionDigits: 0,
    }).format(numValue)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
          <p className="text-gray-600">Failed to load cases</p>
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
            <h1 className="text-sm font-semibold text-gray-900">Cases</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track and manage mortgage cases</p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => {
                setSelectedCaseId('new')
                setSidePanelOpen(true)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Case
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => handleStageFilterChange(e.target.value)}
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            <option value="all">All Stages</option>
            <optgroup label="Active Stages">
              {CASE_STAGES.active.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Hold">
              {CASE_STAGES.hold.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Terminal">
              {CASE_STAGES.terminal.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </optgroup>
          </select>

          <BankFilterDropdown
            value={bankFilter}
            onChange={handleBankFilterChange}
            banks={banks}
          />
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
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
      )}

      {/* Cases Table Card */}
      <div className="mx-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[16%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Bank
                </th>
                <th className="w-[20%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="w-[18%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stage
                </th>
                <th className="w-[16%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th className="w-[16%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created At
                </th>
                <th className="w-[14%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  onClick={() => handleRowClick(caseItem)}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    {caseItem.bank ? (
                      <span className="flex items-center gap-2">
                        {(() => {
                          const bankData = banks?.find(b => b.name === caseItem.bank)
                          return bankData?.icon ? (
                            <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <img
                                src={bankData.icon}
                                alt=""
                                className="h-4 w-4 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </div>
                          ) : null
                        })()}
                        <span className="text-xs text-gray-600">{caseItem.bank}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className="text-xs font-medium text-gray-900">{caseItem.client.name}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        stageColors[caseItem.stage]
                      )}
                    >
                      {getStageLabel(caseItem.stage)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-600">{formatCurrency(caseItem.loan_amount)}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">{formatDate(caseItem.created_at)}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClientId(caseItem.client.id)
                        }}
                        className="p-1 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors"
                        title="View client"
                      >
                        <User className="h-3.5 w-3.5" />
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(caseItem)
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
            onPageChange={handlePageChange}
            itemLabel="cases"
          />

          {cases.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">No cases found</p>
            </div>
          )}
        </div>
      </div>

      {/* Case Side Panel */}
      <CaseSidePanel
        caseId={selectedCaseId}
        isOpen={sidePanelOpen}
        onClose={handleCloseSidePanel}
      />

      {/* Client Side Panel */}
      {selectedClientId && (
        <ClientSidePanel
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
          hideCreateCase
        />
      )}
    </div>
  )
}
