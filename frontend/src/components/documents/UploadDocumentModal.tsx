/**
 * UploadDocumentModal - Modal for uploading a document.
 * Combines document type info with file uploader.
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { FileUploader } from './FileUploader'
import type { DocumentType } from '@/types/documents'

interface UploadDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  documentType: DocumentType
  onUpload: (file: File, documentTypeId: string) => Promise<void>
  isUploading?: boolean
  error?: string | null
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  documentType,
  onUpload,
  isUploading = false,
  error,
}: UploadDocumentModalProps) {
  const [uploadProgress, setUploadProgress] = useState(0)

  if (!isOpen) return null

  const handleUpload = async (file: File) => {
    // Simulate progress
    setUploadProgress(0)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90))
    }, 100)

    try {
      await onUpload(file, documentType.id)
      setUploadProgress(100)
      setTimeout(() => {
        onClose()
      }, 500)
    } finally {
      clearInterval(progressInterval)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Upload {documentType.name}
              </h2>
              {documentType.description && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {documentType.description}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <FileUploader
              onUpload={handleUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={error}
              onCancel={isUploading ? undefined : undefined}
            />
          </div>
        </div>
      </div>
    </>
  )
}
