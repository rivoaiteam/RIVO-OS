/**
 * ActivityTimelineItem - Displays a single activity entry in the timeline.
 * Shows detailed field changes for UPDATE actions.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ActivityTimelineEntry } from '@/types/audit'
import { cn } from '@/lib/utils'

interface ActivityTimelineItemProps {
  entry: ActivityTimelineEntry
}

export function ActivityTimelineItem({ entry }: ActivityTimelineItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChanges = entry.changes && entry.changes.length > 0

  return (
    <div className="py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-400 font-medium pt-0.5 min-w-[52px]">
          {entry.time_display}
        </span>
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {entry.action_summary}
          </p>
          {/* Show expand button for entries with detailed changes */}
          {hasChanges && entry.changes!.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {expanded ? 'Hide details' : `${entry.changes!.length} fields changed`}
            </button>
          )}
          {/* Expanded details */}
          {expanded && hasChanges && (
            <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200">
              {entry.changes!.map((change, idx) => (
                <div key={idx} className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">{change.field_display}:</span>{' '}
                  <span className={cn(change.old_display === 'empty' ? 'text-gray-400 italic' : 'text-red-500 line-through')}>
                    {change.old_display}
                  </span>
                  {' → '}
                  <span className={cn(change.new_display === 'empty' ? 'text-gray-400 italic' : 'text-green-600')}>
                    {change.new_display}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
