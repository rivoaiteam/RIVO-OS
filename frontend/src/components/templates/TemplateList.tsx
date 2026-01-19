/**
 * Admin template list page for Settings > Templates.
 */

import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useMessageTemplates,
  useDeleteTemplate,
  useTemplateCategories,
  type MessageTemplate,
} from '@/hooks/useMessageTemplates'
import { TemplateForm } from './TemplateForm'

export function TemplateList() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Debounce search input to prevent API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: templates, isLoading, error, refetch } = useMessageTemplates({
    search: search || undefined,
    category: categoryFilter || undefined,
  })
  const { data: categories } = useTemplateCategories()
  const deleteMutation = useDeleteTemplate()

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeleteConfirm(null)
    } catch {
      // Error handled by mutation
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingTemplate(null)
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

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-red-500">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">Failed to load templates</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-[#1e3a5f] hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Message Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create templates for Mortgage Specialists to use in WhatsApp chats
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg',
            'bg-[#1e3a5f] hover:bg-[#2a4a6f] transition-colors'
          )}
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search templates..."
            className={cn(
              'w-full pl-9 pr-3 py-2 border rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'
            )}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={cn(
            'px-3 py-2 border rounded-lg text-sm bg-white',
            'focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'
          )}
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {templates && templates.length > 0 ? (
              templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{template.name}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {template.content.slice(0, 60)}
                        {template.content.length > 60 ? '...' : ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                      {template.category_display}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
                        template.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(template.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-1.5 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(template.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                  <p className="text-sm">No templates found</p>
                  <p className="text-xs mt-1">Create your first template to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <TemplateForm
          template={editingTemplate}
          onClose={handleCloseForm}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This action cannot be undone. The template will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                  'bg-red-500 hover:bg-red-600',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
