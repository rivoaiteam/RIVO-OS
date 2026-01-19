/**
 * DocumentPreviewPanel - Simple document preview overlay.
 */

import { X } from 'lucide-react'
import type { ClientDocument, CaseDocument } from '@/types/documents'
import { getFileExtension } from '@/types/documents'

interface DocumentPreviewPanelProps {
  document: ClientDocument | CaseDocument
  isOpen: boolean
  onClose: () => void
}

export function DocumentPreviewPanel({
  document,
  isOpen,
  onClose,
}: DocumentPreviewPanelProps) {
  if (!isOpen) return null

  const fileExtension = getFileExtension(document.file_name || document.file_format)
  const isImage = ['jpg', 'jpeg', 'png', 'heic'].includes(fileExtension)
  const isPdf = fileExtension === 'pdf'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-1/2 min-w-[500px] max-w-[800px] bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-900 truncate">
            {document.document_type_name}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
          {isImage && (
            <img
              src={document.file_url}
              alt={document.file_name}
              className="max-w-full max-h-full object-contain rounded"
            />
          )}
          {isPdf && (
            <iframe
              src={document.file_url}
              className="w-full h-full rounded"
              title={document.file_name}
            />
          )}
          {!isImage && !isPdf && (
            <p className="text-sm text-gray-500">Preview not available</p>
          )}
        </div>
      </div>
    </>
  )
}
