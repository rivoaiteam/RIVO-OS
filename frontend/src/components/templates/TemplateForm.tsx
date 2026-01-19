/**
 * Form component for creating and editing message templates.
 */

import { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCreateTemplate,
  useUpdateTemplate,
  useTemplateCategories,
  type MessageTemplate,
} from '@/hooks/useMessageTemplates'
import { TEMPLATE_VARIABLES, previewTemplateWithSampleData } from '@/utils/templateVariables'

interface TemplateFormProps {
  template?: MessageTemplate | null
  onClose: () => void
  onSuccess?: () => void
}

export function TemplateForm({ template, onClose, onSuccess }: TemplateFormProps) {
  const isEditing = !!template
  const [name, setName] = useState(template?.name || '')
  const [category, setCategory] = useState(template?.category || 'general')
  const [content, setContent] = useState(template?.content || '')
  const [isActive, setIsActive] = useState(template?.is_active ?? true)
  const [showPreview, setShowPreview] = useState(false)
  const [showVariables, setShowVariables] = useState(false)

  const { data: categories } = useTemplateCategories()
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()

  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  useEffect(() => {
    if (template) {
      setName(template.name)
      setCategory(template.category)
      setContent(template.content)
      setIsActive(template.is_active)
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !content.trim()) return

    try {
      if (isEditing && template) {
        await updateMutation.mutateAsync({
          id: template.id,
          data: { name: name.trim(), category, content: content.trim(), is_active: isActive },
        })
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          category,
          content: content.trim(),
          is_active: isActive,
        })
      }
      onSuccess?.()
      onClose()
    } catch {
      // Error handled by mutation
    }
  }

  const insertVariable = (varName: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.slice(0, start) + `{${varName}}` + content.slice(end)
      setContent(newContent)
      // Focus and set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus()
        const newPos = start + varName.length + 2
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    } else {
      setContent(content + `{${varName}}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {(error as Error).message}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Message"
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm',
                'focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'
              )}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm bg-white',
                'focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'
              )}
            >
              {categories?.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Message Content *
              </label>
              <button
                type="button"
                onClick={() => setShowVariables(!showVariables)}
                className="text-xs text-[#1e3a5f] hover:underline flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                {showVariables ? 'Hide' : 'Show'} Variables
              </button>
            </div>

            {/* Variable chips */}
            {showVariables && (
              <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">
                  Click to insert a variable at cursor position:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => insertVariable(variable.name)}
                      className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-[#1e3a5f] hover:text-white hover:border-[#1e3a5f] transition-colors"
                      title={variable.description}
                    >
                      {`{${variable.name}}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hello {first_name}, thank you for reaching out..."
              rows={6}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm resize-none',
                'focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]'
              )}
              required
            />
          </div>

          {/* Preview Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-[#1e3a5f] hover:underline"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview (with sample data)'}
            </button>

            {showPreview && content && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Preview with sample data:</p>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">
                  {previewTemplateWithSampleData(content)}
                </div>
              </div>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
            />
            <label htmlFor="is-active" className="text-sm text-gray-700">
              Template is active and available for use
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !content.trim()}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
              'bg-[#1e3a5f] hover:bg-[#2a4a6f]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
