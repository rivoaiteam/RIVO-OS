/**
 * Read-only template list for Mortgage Specialists (Toolbox > Templates).
 * Shows active templates that can be used in WhatsApp chats.
 */

import { useState, useEffect } from 'react'
import { Search, AlertCircle, Loader2, Copy, Check, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useMessageTemplates,
  useTemplateCategories,
  type MessageTemplate,
} from '@/hooks/useMessageTemplates'

export function TemplateListReadOnly() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: templates, isLoading, error, refetch } = useMessageTemplates({
    search: search || undefined,
    category: categoryFilter || undefined,
  })
  const { data: categories } = useTemplateCategories()

  const handleCopy = async (template: MessageTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content)
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Copy failed silently
    }
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
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Message Templates</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Browse templates to use in WhatsApp chats with clients
        </p>
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

      {/* Template Cards Grid */}
      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mt-1">
                    {template.category_display}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-1.5 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(template)}
                    className="p-1.5 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy"
                  >
                    {copiedId === template.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">
                {template.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-sm text-gray-500">No templates found</p>
          <p className="text-xs text-gray-400 mt-1">
            Ask your admin to create message templates
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{previewTemplate.name}</h3>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 mt-1">
                  {previewTemplate.category_display}
                </span>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{previewTemplate.content}</p>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Variables like {'{first_name}'} will be automatically replaced with client data when you use this template in chat.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleCopy(previewTemplate)
                  setPreviewTemplate(null)
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg',
                  'bg-[#1e3a5f] hover:bg-[#2a4a6f] transition-colors'
                )}
              >
                <Copy className="w-4 h-4" />
                Copy Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
