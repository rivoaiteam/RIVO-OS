/**
 * FileUploader - Drag-and-drop file upload component.
 * Handles file selection, validation, and upload.
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import {
  ACCEPTED_FORMATS,
  MAX_FILE_SIZE,
  isAcceptedFormat,
  isFileSizeValid,
  formatFileSize,
  getFileExtension,
  getAcceptedFormatsString,
} from '@/types/documents'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>
  documentTypeName?: string
  isUploading?: boolean
  uploadProgress?: number
  error?: string | null
  onCancel?: () => void
}

export function FileUploader({
  onUpload,
  documentTypeName,
  isUploading = false,
  uploadProgress = 0,
  error,
  onCancel,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    const extension = getFileExtension(file.name)

    if (!isAcceptedFormat(extension)) {
      return `Invalid file format. Accepted: ${getAcceptedFormatsString()}`
    }

    if (!isFileSizeValid(file.size)) {
      return `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`
    }

    return null
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      const validationResult = validateFile(file)

      if (validationResult) {
        setValidationError(validationResult)
        setSelectedFile(null)
        setPreviewUrl(null)
        return
      }

      setValidationError(null)
      setSelectedFile(file)

      // Create preview for images
      const extension = getFileExtension(file.name)
      if (['jpg', 'jpeg', 'png'].includes(extension)) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreviewUrl(null)
      }
    },
    [validateFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleUploadClick = async () => {
    if (!selectedFile) return
    await onUpload(selectedFile)
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayError = error || validationError

  return (
    <div className="space-y-4">
      {/* Document type name */}
      {documentTypeName && (
        <div className="text-sm font-medium text-gray-700">
          Upload: {documentTypeName}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          displayError && 'border-red-300 bg-red-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FORMATS.map((f) => `.${f}`).join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Selected file preview or upload prompt */}
        {selectedFile ? (
          <div className="space-y-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="mx-auto max-h-32 rounded-lg object-contain"
              />
            ) : (
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div className="text-sm font-medium text-gray-900 truncate">
              {selectedFile.name}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(selectedFile.size)}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClearFile()
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                'mx-auto w-12 h-12 rounded-full flex items-center justify-center',
                isDragging ? 'bg-[#1e3a5f]/10' : 'bg-gray-100'
              )}
            >
              <Upload
                className={cn(
                  'h-6 w-6',
                  isDragging ? 'text-[#1e3a5f]' : 'text-gray-400'
                )}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-[#1e3a5f]">
                Click to upload
              </span>
              <span className="text-sm text-gray-500"> or drag and drop</span>
            </div>
            <div className="text-xs text-gray-400">
              {getAcceptedFormatsString()} (max {formatFileSize(MAX_FILE_SIZE)})
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {displayError}
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Uploading...</span>
            <span className="text-gray-600">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#1e3a5f] h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !isUploading && !displayError && (
        <button
          type="button"
          onClick={handleUploadClick}
          className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors"
        >
          Upload Document
        </button>
      )}
    </div>
  )
}
