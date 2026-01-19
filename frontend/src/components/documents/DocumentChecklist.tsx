/**
 * DocumentChecklist - Clean list of documents with checkmarks.
 */

import { useState, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { DocumentChecklistItem } from './DocumentChecklistItem'
import type { DocumentChecklistItem as ChecklistItem, ClientDocument, CaseDocument } from '@/types/documents'

interface DocumentChecklistProps {
  items: ChecklistItem[]
  onUpload: (documentTypeId: string, file: File) => void
  onView: (document: ClientDocument | CaseDocument) => void
  onDelete?: (documentId: string) => void
  onAddCustomDocument: (name: string, file: File) => void
  title?: string
  addButtonLabel?: string
  readOnly?: boolean
}

export function DocumentChecklist({
  items,
  onUpload,
  onView,
  onDelete,
  onAddCustomDocument,
  title,
  addButtonLabel = 'Add Document',
  readOnly,
}: DocumentChecklistProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalRequired = items.filter((item) => item.document_type.required).length
  const uploadedRequired = items.filter(
    (item) => item.document_type.required && item.is_uploaded
  ).length

  const handleAddClick = () => {
    setIsAdding(true)
    setNewDocName('')
  }

  const handleCancel = () => {
    setIsAdding(false)
    setNewDocName('')
  }

  const handleUploadClick = () => {
    if (newDocName.trim()) {
      fileInputRef.current?.click()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && newDocName.trim()) {
      onAddCustomDocument(newDocName.trim(), file)
      setIsAdding(false)
      setNewDocName('')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,.heic"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h4>
          <span className="text-xs text-gray-400">
            {uploadedRequired}/{totalRequired}
          </span>
        </div>
      )}

      {/* Document List */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <DocumentChecklistItem
            key={item.document_type.id}
            documentType={item.document_type}
            document={item.document}
            onUpload={onUpload}
            onView={onView}
            onDelete={readOnly ? undefined : onDelete}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Add Document - Inline (hidden in readOnly mode) */}
      {!readOnly && (
        isAdding ? (
          <div className="flex items-center gap-2 py-1">
            <input
              type="text"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="Document name"
              className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-[#1e3a5f]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUploadClick()
                if (e.key === 'Escape') handleCancel()
              }}
            />
            <button
              onClick={handleUploadClick}
              disabled={!newDocName.trim()}
              className="text-xs text-[#1e3a5f] hover:underline disabled:text-gray-300 disabled:no-underline"
            >
              Upload
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddClick}
            className="flex items-center gap-1.5 text-xs text-[#1e3a5f] hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            {addButtonLabel}
          </button>
        )
      )}
    </div>
  )
}
