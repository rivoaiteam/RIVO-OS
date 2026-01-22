/**
 * Admin template list page for Settings > Templates.
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/Pagination'
import { TablePageLayout, TableCard, TableContainer, PageLoading, PageError, StatusErrorToast } from '@/components/ui/TablePageLayout'
import {
  useMessageTemplates,
  useDeleteTemplate,
  useTemplateCategories,
  type MessageTemplate,
} from '@/hooks/useMessageTemplates'
import { TemplateForm } from './TemplateForm'

const STATUS_TABS: { value: 'all' | 'active' | 'inactive'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const PAGE_SIZE = 10

export function TemplateList() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: templates, isLoading, error, refetch } = useMessageTemplates({
    search: searchQuery || undefined,
    category: categoryFilter || undefined,
  })
  const { data: categories } = useTemplateCategories()
  const deleteMutation = useDeleteTemplate()

  // Apply status filter client-side
  const filteredTemplates = (templates || []).filter(template => {
    if (statusFilter === 'active') return template.is_active
    if (statusFilter === 'inactive') return !template.is_active
    return true
  })

  // Client-side pagination
  const totalItems = filteredTemplates.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleDelete = async (template: MessageTemplate) => {
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(template.id)
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : 'Failed to delete template')
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError entityName="templates" message={(error as Error).message} />

  return (
    <TablePageLayout>
      {/* Page Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Message Templates</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage WhatsApp message templates</p>
          </div>
          <button
            onClick={() => setSelectedTemplateId('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Template
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
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
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
            className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusError && (
        <StatusErrorToast message={statusError} onClose={() => setStatusError(null)} />
      )}

      {/* Templates Table */}
      <TableCard>
        <TableContainer isEmpty={paginatedTemplates.length === 0} emptyMessage="No templates found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[30%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[15%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                <th className="w-[10%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="w-[15%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                <th className="w-[15%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
                <th className="w-[15%] text-right pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTemplates.map((template) => (
                <tr
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    <div>
                      <span className="text-xs font-medium text-gray-900 block">{template.name}</span>
                      <span className="text-[10px] text-gray-500 truncate block max-w-xs">
                        {template.content.slice(0, 50)}{template.content.length > 50 ? '...' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
                      {template.category_display}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded',
                        template.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">{formatDate(template.created_at)}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-500">{formatDate(template.updated_at)}</span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template)
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          itemLabel="templates"
        />
      </TableCard>

      {/* Template Side Panel */}
      {selectedTemplateId && (
        <TemplateForm
          template={selectedTemplateId === 'new' ? null : templates?.find(t => t.id === selectedTemplateId)}
          onClose={() => setSelectedTemplateId(null)}
          onSuccess={() => refetch()}
        />
      )}
    </TablePageLayout>
  )
}
