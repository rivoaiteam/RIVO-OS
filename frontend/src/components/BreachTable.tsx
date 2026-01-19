/**
 * BreachTable - Table component for displaying SLA breaches.
 * Shows Client/Case, SLA Type, Owner, Overdue By, Last Activity.
 * Rows are clickable to view details (no action buttons).
 */

import { cn } from '@/lib/utils'
import type { SLABreachItem } from '@/types/sla'
import { SLA_TYPE_LABELS } from '@/types/sla'

interface BreachTableProps {
  breaches: SLABreachItem[]
  onView: (breach: SLABreachItem) => void
}

// SLA Type badge colors
const slaTypeBadgeColors: Record<string, string> = {
  first_contact: 'bg-blue-100 text-blue-700',
  client_to_case: 'bg-purple-100 text-purple-700',
  stage: 'bg-amber-100 text-amber-700',
}

export function BreachTable({ breaches, onView }: BreachTableProps) {
  if (breaches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xs text-gray-500">No SLA breaches found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              SLA Type
            </th>
            <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Owner
            </th>
            <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Overdue
            </th>
            <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Last Activity
            </th>
          </tr>
        </thead>
        <tbody>
          {breaches.map((breach) => (
            <tr
              key={`${breach.entity_type}-${breach.entity_id}-${breach.sla_type}`}
              onClick={() => onView(breach)}
              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              {/* Name */}
              <td className="py-3">
                <span className="text-xs font-medium text-gray-900">
                  {breach.entity_name}
                </span>
              </td>

              {/* SLA Type */}
              <td className="py-3">
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded',
                    slaTypeBadgeColors[breach.sla_type] || 'bg-gray-100 text-gray-700'
                  )}
                >
                  {breach.sla_type_display || SLA_TYPE_LABELS[breach.sla_type]}
                </span>
              </td>

              {/* Owner */}
              <td className="py-3">
                <span className="text-xs text-gray-700">
                  {breach.assigned_to?.name || '-'}
                </span>
              </td>

              {/* Overdue By */}
              <td className="py-3">
                <span className="text-xs font-medium text-red-600">
                  {breach.overdue_display}
                </span>
              </td>

              {/* Last Activity - time only */}
              <td className="py-3">
                {breach.last_activity_display ? (
                  <span className="text-xs text-gray-500">
                    {breach.last_activity_display}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 italic">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
