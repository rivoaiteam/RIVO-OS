import { useState } from 'react'
import { Check, Loader2, Building2 } from 'lucide-react'
import { useDashboardReminders, useCompleteReminder } from '@/hooks/useAudit'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { LeadSidePanel } from '@/components/LeadSidePanel'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
  PageHeader,
  PageLoading,
} from '@/components/ui/TablePageLayout'
import { cn } from '@/lib/utils'
import type { NotableType } from '@/types/audit'

export function DashboardPage() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<string | null>(null)

  const { data: reminders, isLoading } = useDashboardReminders()
  const completeMutation = useCompleteReminder()

  const handleNavigate = (type: NotableType, id: string) => {
    if (type === 'client') {
      setSelectedClient(id)
    } else if (type === 'case') {
      setSelectedCase(id)
    } else if (type === 'lead') {
      setSelectedLead(id)
    }
  }

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    completeMutation.mutate(id)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return ` at ${hour12}:${minutes} ${ampm}`
  }

  if (isLoading) {
    return <PageLoading />
  }

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader
          title="Reminders"
          subtitle="Your pending follow-ups"
          hideAction
        />
      </div>

      <TableCard>
        <TableContainer isEmpty={!reminders?.length} emptyMessage="No reminders">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Client</th>
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Case</th>
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Note</th>
                <th className="w-1/4 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Due</th>
                <th className="w-12 text-left pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {reminders?.map((reminder) => (
                <tr
                  key={reminder.id}
                  onClick={() => handleNavigate(reminder.notable_type, reminder.notable_id)}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    <span className="text-xs font-medium text-gray-900">{reminder.client_name ?? reminder.notable_name}</span>
                  </td>
                  <td className="py-3">
                    {reminder.case_bank ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        {reminder.case_bank}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-600 truncate block">{reminder.note_text}</span>
                  </td>
                  <td className="py-3">
                    <span className={cn(
                      'text-xs',
                      reminder.is_overdue ? 'text-red-600' : 'text-gray-500'
                    )}>
                      {formatDate(reminder.reminder_date)}{formatTime(reminder.reminder_time)}
                      {reminder.is_overdue && ' • Overdue'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={(e) => handleComplete(reminder.id, e)}
                      disabled={completeMutation.isPending && completeMutation.variables === reminder.id}
                      className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      {completeMutation.isPending && completeMutation.variables === reminder.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      </TableCard>

      {/* Side Panels */}
      {selectedClient && (
        <ClientSidePanel
          clientId={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
      <CaseSidePanel
        caseId={selectedCase}
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
      />
      <LeadSidePanel
        leadId={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </TablePageLayout>
  )
}
