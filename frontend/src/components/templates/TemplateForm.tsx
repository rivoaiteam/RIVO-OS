/**
 * Side panel for creating and editing message templates.
 */

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'
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
  const isCreateMode = !template
  const [name, setName] = useState(template?.name || '')
  const [category, setCategory] = useState(template?.category || 'general')
  const [content, setContent] = useState(template?.content || '')
  const [isActive, setIsActive] = useState(template?.is_active ?? true)
  const [showPreview, setShowPreview] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: categories } = useTemplateCategories()
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()

  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (template) {
      setName(template.name)
      setCategory(template.category)
      setContent(template.content)
      setIsActive(template.is_active)
    }
  }, [template])

  const handleSave = async () => {
    setSaveError(null)

    if (!name.trim()) {
      setSaveError('Name is required')
      return
    }
    if (!content.trim()) {
      setSaveError('Content is required')
      return
    }

    try {
      if (isCreateMode) {
        await createMutation.mutateAsync({
          name: name.trim(),
          category,
          content: content.trim(),
          is_active: isActive,
        })
      } else {
        await updateMutation.mutateAsync({
          id: template!.id,
          data: { name: name.trim(), category, content: content.trim(), is_active: isActive },
        })
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  const insertVariable = (varName: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.slice(0, start) + `{${varName}}` + content.slice(end)
      setContent(newContent)
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
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-1/2 min-w-[480px] max-w-[800px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">
            {isCreateMode ? 'New Template' : 'Edit Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Save Error */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {saveError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder="e.g., Welcome Message"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
            >
              {categories?.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Variables */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Available variables (click to insert):</p>
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

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Message Content <span className="text-red-500">*</span>
            </label>
            <textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hello {first_name}, thank you for reaching out..."
              rows={6}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* Preview */}
          <div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-[#1e3a5f] hover:underline"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>

            {showPreview && content && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[10px] text-gray-500 mb-1.5">Preview with sample data:</p>
                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white rounded p-2 border border-gray-200">
                  {previewTemplateWithSampleData(content)}
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  isActive
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  !isActive
                    ? 'bg-gray-200 text-gray-600 border-gray-300'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCreateMode ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}
