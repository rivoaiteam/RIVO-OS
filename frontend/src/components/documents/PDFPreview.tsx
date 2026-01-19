/**
 * PDFPreview - PDF viewer for document preview.
 * Embeds PDF in an iframe for simple viewing.
 */

import { useState } from 'react'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'

interface PDFPreviewProps {
  fileUrl: string
  fileName: string
}

export function PDFPreview({ fileUrl, fileName }: PDFPreviewProps) {
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
    <div className="flex flex-col h-full">
      {isLoading && !hasError && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading PDF...</span>
        </div>
      )}

      {hasError && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Failed to load PDF</p>
            <p className="text-xs text-gray-500 mt-1">
              The PDF could not be displayed in the preview
            </p>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-2 px-4 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#2d4a6f] transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        </div>
      )}

      <iframe
        src={fileUrl}
        title={fileName}
        onLoad={handleLoad}
        onError={handleError}
        className={`flex-1 w-full border-0 rounded-lg ${
          isLoading || hasError ? 'hidden' : 'block'
        }`}
      />
    </div>
  )
}
