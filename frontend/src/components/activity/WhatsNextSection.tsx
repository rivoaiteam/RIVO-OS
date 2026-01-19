/**
 * WhatsNextSection - Dashboard section showing pending reminders.
 */

import { Loader2, Bell, CheckCircle2 } from 'lucide-react'
import { useDashboardReminders } from '@/hooks/useAudit'
import { ReminderCard } from './ReminderCard'
import type { NotableType } from '@/types/audit'

interface WhatsNextSectionProps {
  onNavigate?: (type: NotableType, id: string) => void
}

export function WhatsNextSection({ onNavigate }: WhatsNextSectionProps) {
  const { data: reminders, isLoading, error, refetch } = useDashboardReminders()

  const handleUpdate = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">What's Next</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">What's Next</h2>
        </div>
        <p className="text-sm text-red-600 text-center py-4">
          Failed to load reminders
        </p>
      </div>
    )
  }

  const overdueReminders = reminders?.filter((r) => r.is_overdue) || []
  const dueTodayReminders = reminders?.filter((r) => r.is_due_today && !r.is_overdue) || []
  const totalCount = reminders?.length || 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">What's Next</h2>
          </div>
          {totalCount > 0 && (
            <span className="text-sm text-gray-500">
              {totalCount} reminder{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Summary */}
        {totalCount > 0 && (
          <div className="mt-3 flex gap-4 text-xs">
            {overdueReminders.length > 0 && (
              <span className="text-red-600 font-medium">
                {overdueReminders.length} overdue
              </span>
            )}
            {dueTodayReminders.length > 0 && (
              <span className="text-amber-600 font-medium">
                {dueTodayReminders.length} due today
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {totalCount === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">You're all caught up!</p>
            <p className="text-xs text-gray-400 mt-1">
              No reminders due today
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {/* Overdue first */}
            {overdueReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onUpdate={handleUpdate}
                onNavigate={onNavigate}
              />
            ))}

            {/* Then today's */}
            {dueTodayReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onUpdate={handleUpdate}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
