/**
 * DocumentChecklistItem - Simple item with checkmark and inline upload.
 */

import { useRef } from 'react'
import { Check, Eye, Trash2 } from 'lucide-react'
import type { DocumentType, ClientDocument, CaseDocument } from '@/types/documents'
import { cn } from '@/lib/utils'
import { ACCEPTED_FORMATS, isAcceptedFormat, isFileSizeValid } from '@/types/documents'

interface DocumentChecklistItemProps {
  documentType: DocumentType
  document: ClientDocument | CaseDocument | null
  onUpload: (documentTypeId: string, file: File) => void
  onView: (document: ClientDocument | CaseDocument) => void
  onDelete?: (documentId: string) => void
  readOnly?: boolean
}

export function DocumentChecklistItem({
  documentType,
  document,
  onUpload,
  onView,
  onDelete,
  readOnly,
}: DocumentChecklistItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUploaded = document !== null && document.file_url

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!isAcceptedFormat(ext)) {
      alert('Invalid file format. Use: JPG, PNG, PDF, HEIC')
      return
    }
    if (!isFileSizeValid(file.size)) {
      alert('File too large. Max 10MB')
      return
    }

    onUpload(documentType.id, file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (document && onDelete) {
      onDelete(document.id)
    }
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS.map(f => `.${f}`).join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Checkmark */}
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2',
          isUploaded
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 bg-white'
        )}
      >
        {isUploaded && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>

      {/* Document name - clickable */}
      <button
        onClick={() => isUploaded && document ? onView(document) : (!readOnly && fileInputRef.current?.click())}
        className={cn(
          'flex-1 text-left text-sm',
          isUploaded ? 'text-gray-900' : 'text-gray-600',
          !readOnly && !isUploaded && 'hover:text-gray-900'
        )}
      >
        {documentType.name}
        {isUploaded && <Check className="inline-block h-3.5 w-3.5 ml-1.5 text-green-500" />}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {isUploaded ? (
          <>
            <button
              onClick={() => document && onView(document)}
              className="p-1 text-gray-400 hover:text-[#1e3a5f] rounded"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </button>
            {!readOnly && onDelete && (
              <button
                onClick={handleDelete}
                className="p-1 text-gray-400 hover:text-red-500 rounded"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        ) : !readOnly ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-[#1e3a5f] hover:underline"
          >
            Upload
          </button>
        ) : null}
      </div>
    </div>
  )
}
