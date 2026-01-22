/**
 * SLACountdown - Component for displaying SLA countdown timers.
 * Shows remaining time with color-coded status indicators.
 *
 * Visual Indicators:
 * - Green: Plenty of time remaining (>50% of SLA / 'ok' status)
 * - Yellow/Orange: Warning (<50% remaining / 'warning' status)
 * - Red: Overdue
 *
 * Format:
 * - Non-overdue: "Xh remaining"
 * - Overdue <24h: "Xh overdue"
 * - Overdue >=24h: "Xd overdue"
 */

import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SLAStatus = 'ok' | 'warning' | 'overdue' | 'completed' | 'not_started' | 'no_sla'

export interface SLACountdownProps {
  /** SLA status: ok, warning, overdue, completed, not_started, or no_sla */
  status: SLAStatus
  /** Remaining hours (negative if overdue) */
  remainingHours: number | null
  /** Display text from backend (optional, will be computed if not provided) */
  displayText?: string | null
  /** Optional label to show above the countdown (e.g., "First Contact SLA") */
  label?: string
  /** Optional stage name for case SLA */
  stageName?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show icon */
  showIcon?: boolean
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
 * Get color classes based on SLA status.
 */
function getStatusColors(status: SLAStatus): { text: string; bg: string; icon: string; border: string } {
  switch (status) {
    case 'ok':
      // Neutral color for time remaining (only completed is green)
      return {
        text: 'text-gray-700',
        bg: 'bg-gray-50',
        icon: 'text-gray-500',
        border: 'border-gray-200',
      }
    case 'warning':
      return {
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        icon: 'text-amber-600',
        border: 'border-amber-200',
      }
    case 'overdue':
      return {
        text: 'text-red-700',
        bg: 'bg-red-50',
        icon: 'text-red-600',
        border: 'border-red-200',
      }
    case 'completed':
      // Only completed status shows green
      return {
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        icon: 'text-emerald-600',
        border: 'border-emerald-200',
      }
    case 'not_started':
    case 'no_sla':
    default:
      return {
        text: 'text-gray-600',
        bg: 'bg-gray-50',
        icon: 'text-gray-500',
        border: 'border-gray-200',
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

export function SLACountdown({
  status,
  remainingHours,
  displayText,
  label,
  stageName,
  size = 'md',
  showIcon = true,
  className,
}: SLACountdownProps) {
  const colors = getStatusColors(status)
  const text = displayText || formatRemainingTime(remainingHours, status)

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'px-2.5 py-1.5',
      text: 'text-xs',
      icon: 'h-3.5 w-3.5',
      label: 'text-[10px]',
    },
    md: {
      container: 'px-3 py-2',
      text: 'text-sm',
      icon: 'h-4 w-4',
      label: 'text-xs',
    },
    lg: {
      container: 'px-4 py-2.5',
      text: 'text-base',
      icon: 'h-5 w-5',
      label: 'text-sm',
    },
  }

  const sizeConfig = sizeClasses[size]

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {label && (
        <span className={cn('font-medium text-gray-500', sizeConfig.text)}>
          {label}
          {stageName && <span className="font-normal"> - {stageName}</span>}:
        </span>
      )}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md font-medium',
          colors.text,
          sizeConfig.text
        )}
      >
        {showIcon && (
          <StatusIcon status={status} className={cn(sizeConfig.icon, colors.icon)} />
        )}
        <span>{text}</span>
      </div>
    </div>
  )
}

export default SLACountdown
