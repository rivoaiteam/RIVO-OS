/**
 * ActivityTimelineItem - Displays a single activity entry in the timeline.
 * Simple, human-readable format per spec.
 */

import type { ActivityTimelineEntry } from '@/types/audit'

interface ActivityTimelineItemProps {
  entry: ActivityTimelineEntry
}

export function ActivityTimelineItem({ entry }: ActivityTimelineItemProps) {
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <span className="text-xs text-gray-400 font-medium pt-0.5 min-w-[52px]">
        {entry.time_display}
      </span>
      <p className="text-sm text-gray-600 flex-1">
        {entry.action_summary}
      </p>
    </div>
  )
}
