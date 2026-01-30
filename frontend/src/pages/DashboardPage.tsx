import { useState } from 'react'
import { Check, Loader2, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardReminders, useCompleteReminder } from '@/hooks/useAudit'
import { useAnalyticsDashboard } from '@/hooks/useAnalytics'
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
import { formatCurrencyAED } from '@/lib/formatters'
import type { NotableType } from '@/types/audit'
import type { AnalyticsBreakdownRow, StageFunnelItem } from '@/types/analytics'

function getDefaultDateRange() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function AnalyticsDashboard() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState(getDefaultDateRange)

  const { data, isLoading } = useAnalyticsDashboard(dateRange.start, dateRange.end)

  if (isLoading) return <PageLoading />

  const o = data?.overall

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Admin'}`}
          hideAction
        />
      </div>

      {/* Date range */}
      <div className="px-6 pb-4 flex items-center gap-3">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#1e3a5f]"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#1e3a5f]"
        />
      </div>

      {o && (
        <>
          {/* KPI Cards */}
          <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard label="Loans Disbursed" value={formatCurrencyAED(o.total_disbursed)} sub={`${o.loans_count} loans`} />
            <KPICard label="Revenue" value={formatCurrencyAED(o.revenue)} sub="0.9% of disbursed" />
            <KPICard label="Leads" value={o.total_leads} />
            <KPICard label="Conversion" value={o.total_leads > 0 ? `${((o.loans_count / o.total_leads) * 100).toFixed(1)}%` : '0%'} sub="Lead to disbursed" />
            <KPICard label="SLA Breaches" value={o.sla_breaches} />
          </div>

          {/* Channel Owner: Pipeline snapshot cards */}
          {data.pipeline && (
            <div className="px-6 pb-6 grid grid-cols-3 gap-4">
              <KPICard label="Active Leads" value={data.pipeline.active_leads} sub="Current pipeline" />
              <KPICard label="Active Clients" value={data.pipeline.active_clients} sub="Being worked" />
              <KPICard label="Active Cases" value={data.pipeline.active_cases} sub="In progress" />
            </div>
          )}

          {/* Breakdown table */}
          <TableCard>
            {data.breakdown_type === 'source'
              ? <SourceTable rows={data.breakdown} />
              : <ChannelTable rows={data.breakdown} />}
          </TableCard>

          {/* Admin: Stage Funnel */}
          {data.stage_funnel && (
            <div className="px-6 pb-4">
              <StageFunnel stages={data.stage_funnel} />
            </div>
          )}
        </>
      )}
    </TablePageLayout>
  )
}

function KPICard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function TH({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={cn('pb-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wider', align === 'left' ? 'text-left' : 'text-right')}>
      {children}
    </th>
  )
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('py-3 px-4 text-xs text-right text-gray-900', className)}>{children}</td>
}

function ChannelTable({ rows }: { rows: AnalyticsBreakdownRow[] }) {
  if (!rows.length) return <div className="text-center py-8 text-xs text-gray-400">No data for this period</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <TH align="left">Channel</TH>
            <TH>Leads</TH>
            <TH>Clients</TH>
            <TH>Cases</TH>
            <TH>Spend</TH>
            <TH>Disbursed</TH>
            <TH>CPL</TH>
            <TH>Breaches</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="py-3 px-4 text-xs font-medium text-gray-900">{r.name}</td>
              <TD>{r.leads_count}</TD>
              <TD>{r.clients_count}</TD>
              <TD>{r.cases_count}</TD>
              <TD>{r.monthly_spend ? formatCurrencyAED(r.monthly_spend) : '\u2014'}</TD>
              <TD>{formatCurrencyAED(r.total_disbursed)}</TD>
              <TD>
                {r.monthly_spend && r.leads_count > 0 ? formatCurrencyAED(parseFloat(r.monthly_spend) / r.leads_count) : '\u2014'}
              </TD>
              <TD>{r.sla_breaches}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatMinutes(mins: number | null | undefined): string {
  if (mins == null) return '\u2014'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function SourceTable({ rows }: { rows: AnalyticsBreakdownRow[] }) {
  if (!rows.length) return <div className="text-center py-8 text-xs text-gray-400">No data for this period</div>

  const hasLeads = rows.some((r) => r.leads_count > 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <TH align="left">Source</TH>
            <TH>Clients</TH>
            <TH>Cases</TH>
            <TH>Disbursed</TH>
            {hasLeads && <TH>Leads</TH>}
            {hasLeads && <TH>Converted</TH>}
            {hasLeads && <TH>Declined</TH>}
            {hasLeads && <TH>Avg Response</TH>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="py-3 px-4 text-xs font-medium text-gray-900">{r.name}</td>
              <TD>{r.clients_count}</TD>
              <TD>{r.cases_count}</TD>
              <TD>{formatCurrencyAED(r.total_disbursed)}</TD>
              {hasLeads && <TD>{r.leads_count}</TD>}
              {hasLeads && <TD className="text-green-600">{r.converted_pct ?? 0}%</TD>}
              {hasLeads && <TD className="text-red-500">{r.declined_pct ?? 0}%</TD>}
              {hasLeads && <TD>{formatMinutes(r.avg_response_minutes)}</TD>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StageFunnel({ stages }: { stages: StageFunnelItem[] }) {
  const total = stages.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Case Pipeline</h3>
        <span className="text-xs text-gray-400">{total} active</span>
      </div>
      {stages.length === 0 ? (
        <div className="text-xs text-gray-400">No active cases</div>
      ) : (
        <div className="space-y-2">
          {stages.map((s) => (
            <div key={s.stage_key} className="flex items-center justify-between">
              <span className="text-xs text-gray-900">{s.stage}</span>
              <span className="text-xs font-medium text-gray-900">{s.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


function RemindersDashboard() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<string | null>(null)

  const { data: reminders, isLoading } = useDashboardReminders(true)
  const completeMutation = useCompleteReminder()

  const handleNavigate = (type: NotableType, id: string) => {
    if (type === 'client') setSelectedClient(id)
    else if (type === 'case') setSelectedCase(id)
    else if (type === 'lead') setSelectedLead(id)
  }

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    completeMutation.mutate(id)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return 'Today'
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

  if (isLoading) return <PageLoading />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <PageHeader title="Reminders" subtitle="Your pending follow-ups" hideAction />
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
                    <span className={cn('text-xs', reminder.is_overdue ? 'text-red-600' : 'text-gray-500')}>
                      {formatDate(reminder.reminder_date)}{formatTime(reminder.reminder_time)}
                      {reminder.is_overdue && ' \u2022 Overdue'}
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

      {selectedClient && (
        <ClientSidePanel clientId={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
      <CaseSidePanel caseId={selectedCase} isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} />
      <LeadSidePanel leadId={selectedLead} onClose={() => setSelectedLead(null)} />
    </TablePageLayout>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const showAnalytics = user?.role === 'admin' || user?.role === 'channel_owner'

  if (showAnalytics) return <AnalyticsDashboard />
  return <RemindersDashboard />
}
