/**
 * ReminderCard - Displays a reminder card for the dashboard "What's Next" section.
 */

import { useState } from 'react'
import { Bell, Check, X, Loader2, User, Briefcase, UserPlus } from 'lucide-react'
import { useCompleteReminder, useDismissReminder } from '@/hooks/useAudit'
import type { DashboardReminder, NotableType } from '@/types/audit'
import { cn } from '@/lib/utils'

interface ReminderCardProps {
  reminder: DashboardReminder
  onUpdate: () => void
  onNavigate?: (type: NotableType, id: string) => void
}

const notableTypeIcons: Record<NotableType, React.ElementType> = {
  client: User,
  case: Briefcase,
  lead: UserPlus,
}

const notableTypeLabels: Record<NotableType, string> = {
  client: 'Client',
  case: 'Case',
  lead: 'Lead',
}

export function ReminderCard({ reminder, onUpdate, onNavigate }: ReminderCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

  const completeMutation = useCompleteReminder()
  const dismissMutation = useDismissReminder()

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await completeMutation.mutateAsync(reminder.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to complete reminder:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleDismiss = async () => {
    setIsDismissing(true)
    try {
      await dismissMutation.mutateAsync(reminder.id)
      onUpdate()
    } catch (error) {
      console.error('Failed to dismiss reminder:', error)
    } finally {
      setIsDismissing(false)
    }
  }

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(reminder.notable_type, reminder.notable_id)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const NotableIcon = notableTypeIcons[reminder.notable_type]
  const isPending = isCompleting || isDismissing

  return (
    <div
      className={cn(
        'bg-white rounded-lg border p-4 transition-all hover:shadow-sm',
        reminder.is_overdue
          ? 'border-red-200 bg-red-50/50'
          : 'border-gray-200'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              reminder.is_overdue
                ? 'bg-red-100 text-red-600'
                : 'bg-amber-100 text-amber-600'
            )}
          >
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-sm font-medium',
                  reminder.is_overdue ? 'text-red-700' : 'text-gray-900'
                )}
              >
                {formatDate(reminder.reminder_date)}
              </span>
              {reminder.reminder_time && (
                <span className="text-xs text-gray-500">
                  at {formatTime(reminder.reminder_time)}
                </span>
              )}
            </div>
            {reminder.is_overdue && (
              <span className="text-xs font-medium text-red-600">Overdue</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleComplete}
            disabled={isPending}
            className="p-1.5 text-green-600 hover:bg-green-100 rounded-full transition-colors disabled:opacity-50"
            title="Mark complete"
          >
            {isCompleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            title="Dismiss"
          >
            {isDismissing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Note Content */}
      <p className="text-sm text-gray-700 line-clamp-2 mb-3">
        {reminder.note_text}
      </p>

      {/* Record Link */}
      <button
        onClick={handleNavigate}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors"
      >
        <NotableIcon className="w-3.5 h-3.5" />
        <span>
          {notableTypeLabels[reminder.notable_type]}: {reminder.notable_name}
        </span>
      </button>

      {/* Author */}
      <div className="mt-2 text-xs text-gray-400">
        Added by {reminder.author_name}
      </div>
    </div>
  )
}
