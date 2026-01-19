/**
 * ImagePreview - Image viewer for document preview.
 * Supports JPG, JPEG, PNG, HEIC formats.
 */

import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface ImagePreviewProps {
  fileUrl: string
  fileName: string
}

export function ImagePreview({ fileUrl, fileName }: ImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {isLoading && !hasError && (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading image...</span>
        </div>
      )}

      {hasError && (
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Failed to load image</p>
            <p className="text-xs text-gray-500 mt-1">
              The image could not be displayed
            </p>
          </div>
        </div>
      )}

      <img
        src={fileUrl}
        alt={fileName}
        onLoad={handleLoad}
        onError={handleError}
        className={`max-w-full max-h-full object-contain rounded-lg ${
          isLoading || hasError ? 'hidden' : 'block'
        }`}
      />
    </div>
  )
}
