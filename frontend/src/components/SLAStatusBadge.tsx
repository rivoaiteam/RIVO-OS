/**
 * SLAStatusBadge - Compact badge variant of SLA countdown for list views.
 * Shows a small colored badge with tooltip on hover for full details.
 *
 * Visual Indicators (same as SLACountdown):
 * - Green: Plenty of time remaining (>50% of SLA / 'ok' status)
 * - Yellow/Orange: Warning (<50% remaining / 'warning' status)
 * - Red: Overdue
 */

import { useState, useRef, useEffect } from 'react'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SLAStatus } from './SLACountdown'

export interface SLAStatusBadgeProps {
  /** SLA status: ok, warning, overdue, completed, not_started, or no_sla */
  status: SLAStatus
  /** Remaining hours (negative if overdue) */
  remainingHours: number | null
  /** Display text from backend (optional, will be computed if not provided) */
  displayText?: string | null
  /** SLA type label for tooltip (e.g., "First Contact SLA", "Stage SLA") */
  slaType?: string
  /** Optional stage name for case SLA */
  stageName?: string
  /** Size variant */
  size?: 'sm' | 'md'
  /** Additional class names */
  className?: string
}

/**
 * Format remaining hours into human-readable display text.
 */
function formatRemainingTime(hours: number | null, status: SLAStatus): string {
  if (hours === null) {
    if (status === 'completed') return 'Completed'
    if (status === 'not_started') return 'Not started'
    if (status === 'no_sla') return 'No SLA'
    return '-'
  }

  if (status === 'completed') return 'Completed'

  if (hours >= 0) {
    // Non-overdue
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes}m remaining`
    }
    return `${Math.round(hours)}h remaining`
  } else {
    // Overdue
    const overdueHours = Math.abs(hours)
    if (overdueHours >= 24) {
      const days = Math.floor(overdueHours / 24)
      return `${days}d overdue`
    }
    return `${Math.round(overdueHours)}h overdue`
  }
}

/**
 * Format short badge text (compact version).
 */
function formatShortText(hours: number | null, status: SLAStatus): string {
  if (hours === null) {
    if (status === 'completed') return 'Done'
    if (status === 'not_started') return '-'
    if (status === 'no_sla') return '-'
    return '-'
  }

  if (status === 'completed') return 'Done'

  if (hours >= 0) {
    // Non-overdue
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return `${minutes}m`
    }
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      return `${days}d`
    }
    return `${Math.round(hours)}h`
  } else {
    // Overdue
    const overdueHours = Math.abs(hours)
    if (overdueHours >= 24) {
      const days = Math.floor(overdueHours / 24)
      return `-${days}d`
    }
    return `-${Math.round(overdueHours)}h`
  }
}

/**
 * Get color classes based on SLA status.
 */
function getStatusColors(status: SLAStatus): { text: string; bg: string; border: string; icon: string } {
  switch (status) {
    case 'ok':
      return {
        text: 'text-green-700',
        bg: 'bg-green-100',
        border: 'border-green-200',
        icon: 'text-green-600',
      }
    case 'warning':
      return {
        text: 'text-amber-700',
        bg: 'bg-amber-100',
        border: 'border-amber-200',
        icon: 'text-amber-600',
      }
    case 'overdue':
      return {
        text: 'text-red-700',
        bg: 'bg-red-100',
        border: 'border-red-200',
        icon: 'text-red-600',
      }
    case 'completed':
      return {
        text: 'text-emerald-700',
        bg: 'bg-emerald-100',
        border: 'border-emerald-200',
        icon: 'text-emerald-600',
      }
    case 'not_started':
    case 'no_sla':
    default:
      return {
        text: 'text-gray-500',
        bg: 'bg-gray-100',
        border: 'border-gray-200',
        icon: 'text-gray-400',
      }
  }
}

/**
 * Get the appropriate icon component based on status.
 */
function StatusIcon({ status, className }: { status: SLAStatus; className?: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className={className} />
    case 'overdue':
      return <AlertTriangle className={className} />
    default:
      return <Clock className={className} />
  }
}

export function SLAStatusBadge({
  status,
  remainingHours,
  displayText,
  slaType,
  stageName,
  size = 'sm',
  className,
}: SLAStatusBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top')
  const badgeRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const colors = getStatusColors(status)
  const shortText = formatShortText(remainingHours, status)
  const fullText = displayText || formatRemainingTime(remainingHours, status)

  // Size classes
  const sizeClasses = {
    sm: {
      badge: 'px-1.5 py-0.5 text-[10px]',
      icon: 'h-2.5 w-2.5',
    },
    md: {
      badge: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
    },
  }

  const sizeConfig = sizeClasses[size]

  // Calculate tooltip position based on viewport
  useEffect(() => {
    if (showTooltip && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect()
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom

      if (spaceAbove < 80 && spaceBelow > spaceAbove) {
        setTooltipPosition('bottom')
      } else {
        setTooltipPosition('top')
      }
    }
  }, [showTooltip])

  // Don't render badge for no_sla or not_started if there's no meaningful data
  if ((status === 'no_sla' || status === 'not_started') && remainingHours === null) {
    return null
  }

  return (
    <div
      ref={badgeRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded border font-medium',
          colors.bg,
          colors.text,
          colors.border,
          sizeConfig.badge
        )}
      >
        <StatusIcon status={status} className={cn(sizeConfig.icon, colors.icon)} />
        <span>{shortText}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 px-2.5 py-1.5 text-xs bg-gray-900 text-white rounded-md shadow-lg whitespace-nowrap',
            'transition-opacity duration-150',
            tooltipPosition === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
              : 'top-full left-1/2 -translate-x-1/2 mt-1.5'
          )}
        >
          {/* Arrow */}
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent',
              tooltipPosition === 'top'
                ? 'top-full border-t-4 border-t-gray-900'
                : 'bottom-full border-b-4 border-b-gray-900'
            )}
          />

          {/* Content */}
          <div className="flex flex-col gap-0.5">
            {slaType && (
              <span className="font-semibold text-gray-300">
                {slaType}
                {stageName && <span className="font-normal"> - {stageName}</span>}
              </span>
            )}
            <span className={cn(
              'font-medium',
              status === 'ok' && 'text-green-400',
              status === 'warning' && 'text-amber-400',
              status === 'overdue' && 'text-red-400',
              status === 'completed' && 'text-emerald-400',
            )}>
              {fullText}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SLAStatusBadge
