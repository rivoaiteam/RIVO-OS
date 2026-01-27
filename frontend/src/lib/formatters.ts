/**
 * Common formatting utilities used across the application.
 */

/**
 * Format a date string to relative time (e.g., "2d ago", "5h ago").
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}d ago`
  if (diffHours > 0) return `${diffHours}h ago`
  if (diffMins > 0) return `${diffMins}m ago`
  return 'Just now'
}

/**
 * Format a date string to "DD Mon YYYY" format (e.g., "15 Jan 2024").
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format a date string to "Mon DD, YYYY" format (e.g., "Jan 15, 2024").
 */
export function formatDateAE(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a number as AED currency (e.g., "AED 150,000").
 */
export function formatCurrencyAED(value: string | number): string {
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(numValue)
}

/**
 * Format DBR (Debt Burden Ratio) as percentage.
 */
export function formatDbr(dbrString: string | null): string {
  if (!dbrString) return '-'
  const dbr = parseFloat(dbrString)
  if (isNaN(dbr)) return '-'
  return `${dbr.toFixed(1)}%`
}

/**
 * Get color class for DBR percentage.
 * Green: < 30% (low DBR, good)
 * Amber: 30-50% (moderate, approaching limit)
 * Red: > 50% (over typical bank limit)
 */
export function getDbrColorClass(dbrString: string | null): string {
  if (!dbrString) return 'text-gray-500'
  const dbr = parseFloat(dbrString)
  if (isNaN(dbr)) return 'text-gray-500'
  if (dbr < 30) return 'text-green-600'
  if (dbr <= 50) return 'text-amber-600'
  return 'text-red-600'
}
