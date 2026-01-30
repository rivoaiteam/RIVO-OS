/**
 * DocumentChecklistItem - Item with checkmark and inline upload.
 * Unified UI for single-file and multi-file document types.
 */

import { useRef } from 'react'
import { Check, Eye, Trash2 } from 'lucide-react'
import type { DocumentType, ClientDocument, CaseDocument } from '@/types/documents'
import { cn } from '@/lib/utils'
import { ACCEPTED_FORMATS, isAcceptedFormat, isFileSizeValid } from '@/types/documents'

interface DocumentChecklistItemProps {
  documentType: DocumentType
  documents: (ClientDocument | CaseDocument)[]
  uploadedCount: number
  onUpload: (documentTypeId: string, file: File) => void
  onView: (document: ClientDocument | CaseDocument) => void
  onDelete?: (documentId: string) => void
  readOnly?: boolean
}

export function DocumentChecklistItem({
  documentType,
  documents,
  uploadedCount,
  onUpload,
  onView,
  onDelete,
  readOnly,
}: DocumentChecklistItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const maxFiles = documentType.max_files
  const isMulti = maxFiles > 1
  const hasUploads = uploadedCount > 0
  const canUploadMore = uploadedCount < maxFiles
  const remainingSlots = maxFiles - uploadedCount

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (files.length > remainingSlots) {
      alert(`You can only upload ${remainingSlots} more file${remainingSlots !== 1 ? 's' : ''} for this document type.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!isAcceptedFormat(ext)) {
        alert(`Invalid file format for "${file.name}". Use: JPG, PNG, PDF, HEIC`)
        continue
      }
      if (!isFileSizeValid(file.size)) {
        alert(`File "${file.name}" is too large. Max 10MB`)
        continue
      }
      onUpload(documentType.id, file)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation()
    if (onDelete) onDelete(documentId)
  }

  const firstDoc = documents[0] || null

  return (
    <div className="py-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={isMulti}
        accept={ACCEPTED_FORMATS.map(f => `.${f}`).join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Checkmark */}
        <div
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2',
            hasUploads
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 bg-white'
          )}
        >
          {hasUploads && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>

        {/* Document name — clickable */}
        <button
          onClick={() => {
            if (!isMulti && hasUploads && firstDoc) {
              onView(firstDoc)
            } else if (!readOnly && canUploadMore) {
              fileInputRef.current?.click()
            }
          }}
          className={cn(
            'flex-1 text-left text-sm',
            hasUploads ? 'text-gray-900' : 'text-gray-600',
            !readOnly && canUploadMore && !hasUploads && 'hover:text-gray-900'
          )}
        >
          {documentType.name}
          {!isMulti && hasUploads && <Check className="inline-block h-3.5 w-3.5 ml-1.5 text-green-500" />}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!isMulti && hasUploads && firstDoc ? (
            <>
              <button
                onClick={() => onView(firstDoc)}
                className="p-1 text-gray-400 hover:text-[#1e3a5f] rounded"
                title="View"
              >
                <Eye className="h-4 w-4" />
              </button>
              {!readOnly && onDelete && (
                <button
                  onClick={(e) => handleDelete(e, firstDoc.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          ) : !readOnly && canUploadMore ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-[#1e3a5f] hover:underline"
            >
              Upload
            </button>
          ) : null}
        </div>
      </div>

      {/* Uploaded files list (multi-file only) */}
      {isMulti && documents.length > 0 && (
        <div className="ml-8 mt-1 space-y-1">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 group">
              <button
                onClick={() => onView(doc)}
                className="flex-1 text-left text-xs text-gray-500 hover:text-[#1e3a5f] truncate"
                title={doc.file_name}
              >
                {doc.file_name}
              </button>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onView(doc)}
                  className="p-0.5 text-gray-400 hover:text-[#1e3a5f] rounded"
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {!readOnly && onDelete && (
                  <button
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
