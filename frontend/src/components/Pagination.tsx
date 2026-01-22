/**
 * Pagination - Reusable pagination controls component.
 * Used consistently across all list pages.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  // Ensure at least 1 page when there are items
  const pages = totalItems > 0 ? Math.max(1, totalPages) : 1

  return (
    <div className="flex items-center justify-between py-3 px-4 text-xs text-gray-500 border-t border-gray-100">
      <span>{totalItems} {itemLabel}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2">{currentPage} / {pages}</span>
        <button
          onClick={() => onPageChange(Math.min(pages, currentPage + 1))}
          disabled={currentPage === pages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
