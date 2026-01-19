/**
 * TeamPerformancePage - Manager analytics page showing team metrics and SLA breaches.
 */

import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSLABreaches, useActiveUsers } from '@/hooks/useSLABreaches'
import { BreachTable } from '@/components/BreachTable'
import { Pagination } from '@/components/Pagination'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import type { SLABreachItem, SLAType } from '@/types/sla'
import { SLA_TYPE_OPTIONS } from '@/types/sla'

const PAGE_SIZE = 10

export function TeamPerformancePage() {
  const { user } = useAuth()

  // Search and filter state
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [slaTypeFilter, setSlaTypeFilter] = useState<SLAType>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Side panel state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [caseSidePanelOpen, setCaseSidePanelOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Data fetching with server-side pagination
  const { data: breachData, isLoading } = useSLABreaches({
    sla_type: slaTypeFilter,
    owner: ownerFilter,
    page: currentPage,
    page_size: PAGE_SIZE,
    search: searchQuery,
  })
  const { data: users } = useActiveUsers()

  const breaches = breachData?.items || []
  const totalItems = breachData?.total || 0
  const totalPages = breachData?.total_pages || 1

  const handleViewBreach = (breach: SLABreachItem) => {
    if (breach.entity_type === 'client') {
      setSelectedClientId(breach.entity_id)
    } else {
      setSelectedCaseId(breach.entity_id)
      setCaseSidePanelOpen(true)
    }
  }

  const handleSlaTypeChange = (value: string) => {
    setSlaTypeFilter(value as SLAType)
    setCurrentPage(1)
  }

  const handleOwnerChange = (value: string) => {
    setOwnerFilter(value)
    setCurrentPage(1)
  }

  // Access check
  if (user?.role !== 'manager') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Access Denied</p>
          <p className="text-sm text-gray-400 mt-1">This page is only accessible to Managers.</p>
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
            <h1 className="text-sm font-semibold text-gray-900">Team Performance</h1>
            <p className="text-xs text-gray-500 mt-0.5">Monitor team metrics and SLA compliance</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 mt-4">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          <select
            value={slaTypeFilter}
            onChange={(e) => handleSlaTypeChange(e.target.value)}
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            {SLA_TYPE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => handleOwnerChange(e.target.value)}
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            <option value="all">All Owners</option>
            {users?.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SLA Breaches Table */}
      <div className="mx-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <BreachTable
              breaches={breaches}
              onView={handleViewBreach}
            />
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            itemLabel="breaches"
          />
        </div>
      </div>

      {/* Client Side Panel */}
      {selectedClientId && (
        <ClientSidePanel
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
        />
      )}

      {/* Case Side Panel */}
      <CaseSidePanel
        caseId={selectedCaseId}
        isOpen={caseSidePanelOpen}
        onClose={() => {
          setCaseSidePanelOpen(false)
          setSelectedCaseId(null)
        }}
      />
    </div>
  )
}
