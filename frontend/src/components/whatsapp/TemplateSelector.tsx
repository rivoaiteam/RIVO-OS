/**
 * Template selector component for WhatsApp chat.
 *
 * Allows Mortgage Specialists to browse and select message templates,
 * preview them with client data, and insert into the chat.
 */

import { useState } from 'react'
import { X, Search, FileText, Send, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMessageTemplates, useTemplateCategories, type MessageTemplate } from '@/hooks/useMessageTemplates'
import { fillTemplateVariables } from '@/utils/templateVariables'
import type { ClientData } from '@/types/mortgage'

interface TemplateSelectorProps {
  client: Partial<ClientData>
  onSelect: (content: string) => void
  onClose: () => void
}

export function TemplateSelector({ client, onSelect, onClose }: TemplateSelectorProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)

  const { data: templates, isLoading } = useMessageTemplates({
    search: search || undefined,
    category: categoryFilter || undefined,
  })
  const { data: categories } = useTemplateCategories()

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template)
  }

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      const filledContent = fillTemplateVariables(selectedTemplate.content, client)
      onSelect(filledContent)
      onClose()
    }
  }

  const handleSendDirectly = () => {
    if (selectedTemplate) {
      const filledContent = fillTemplateVariables(selectedTemplate.content, client)
      onSelect(filledContent)
      // The parent component will handle sending immediately
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1e3a5f]" />
            <h2 className="text-base font-semibold text-gray-900">Message Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className="w-1/2 border-r border-gray-100 flex flex-col">
            {/* Search and Filter */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className={cn(
                    'w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'
                  )}
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-full transition-colors',
                    !categoryFilter
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  All
                </button>
                {categories?.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-full transition-colors',
                      categoryFilter === cat.value
                        ? 'bg-[#1e3a5f] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3a5f] mx-auto" />
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={cn(
                        'w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group',
                        selectedTemplate?.id === template.id && 'bg-blue-50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {template.content.slice(0, 50)}...
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 text-gray-300 flex-shrink-0 ml-2 transition-colors',
                          selectedTemplate?.id === template.id && 'text-[#1e3a5f]'
                        )}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No templates found</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-1/2 flex flex-col bg-gray-50">
            {selectedTemplate ? (
              <>
                <div className="p-3 border-b border-gray-100 bg-white">
                  <h3 className="text-sm font-medium text-gray-900">{selectedTemplate.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    {selectedTemplate.category_display}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  <p className="text-xs text-gray-500 mb-2">Preview with client data:</p>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {fillTemplateVariables(selectedTemplate.content, client)}
                    </p>
                  </div>
                </div>

                <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
                  <button
                    onClick={handleUseTemplate}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      'border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5'
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    Insert into Chat
                  </button>
                  <button
                    onClick={handleSendDirectly}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                      'bg-[#1e3a5f] hover:bg-[#2a4a6f]'
                    )}
                  >
                    <Send className="w-4 h-4" />
                    Send Now
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a template to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
