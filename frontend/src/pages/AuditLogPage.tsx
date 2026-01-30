import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuditLogs } from '@/hooks/useAudit'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
} from '@/components/ui/TablePageLayout'
import { cn } from '@/lib/utils'
import type { AuditAction, AuditLogQueryParams } from '@/types/audit'
import { AUDIT_ACTION_LABELS, TABLE_NAME_LABELS } from '@/types/audit'

export function AuditLogPage() {
  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState<AuditAction | ''>('')
  const [filters, setFilters] = useState<AuditLogQueryParams>({ page: 1, page_size: 20 })

  const { data, isLoading, error } = useAuditLogs(filters)

  const handleFilterChange = (newTable: string, newAction: string) => {
    setFilters({
      ...filters,
      page: 1,
      table_name: newTable || undefined,
      action: (newAction as AuditAction) || undefined,
    })
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    })
  }

  const formatChanges = (changes: Record<string, unknown>) => {
    if (!changes || Object.keys(changes).length === 0) return '\u2014'
    const keys = Object.keys(changes)
    return keys.length <= 2 ? keys.join(', ') : `${keys.slice(0, 2).join(', ')} +${keys.length - 2}`
  }

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Audit Log</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track all changes across the system</p>
        </div>
      </div>

      <div className="px-6 pb-3 flex items-center gap-3">
        <select
          value={tableName}
          onChange={e => { setTableName(e.target.value); handleFilterChange(e.target.value, action) }}
          className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
        >
          <option value="">All Tables</option>
          {Object.entries(TABLE_NAME_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={action}
          onChange={e => { setAction(e.target.value as AuditAction | ''); handleFilterChange(tableName, e.target.value) }}
          className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
        >
          <option value="">All Actions</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <TableCard>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className="text-xs">Failed to load audit logs</span>
          </div>
        ) : (
          <>
            <TableContainer isEmpty={!data?.items.length} emptyMessage="No audit logs">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Timestamp</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Table</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3">
                        <span className="text-xs text-gray-600">{formatTimestamp(entry.timestamp)}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs font-medium text-gray-900">{entry.user_name}</span>
                      </td>
                      <td className="py-3">
                        <span className={cn(
                          'px-2 py-0.5 text-[10px] font-medium rounded',
                          entry.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                          entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {AUDIT_ACTION_LABELS[entry.action]}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-gray-600">{TABLE_NAME_LABELS[entry.table_name] || entry.table_name}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-gray-500">{formatChanges(entry.changes)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {data && data.total_pages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.total_pages}
                totalItems={data.total}
                onPageChange={p => setFilters({ ...filters, page: p })}
                itemLabel="entries"
              />
            )}
          </>
        )}
      </TableCard>
    </TablePageLayout>
  )
}
