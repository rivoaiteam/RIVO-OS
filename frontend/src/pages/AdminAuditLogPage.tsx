/**
 * AdminAuditLogPage - Full audit log view for administrators.
 * Provides filtering, pagination, and export functionality.
 */

import { useState } from 'react'
import {
  Loader2,
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileJson,
  FileSpreadsheet
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuditLogs, useExportAuditLogs } from '@/hooks/useAudit'
import type { AuditAction, AuditLogQueryParams } from '@/types/audit'
import { AUDIT_ACTION_LABELS, TABLE_NAME_LABELS } from '@/types/audit'

export function AdminAuditLogPage() {
  // Filter state
  const [filters, setFilters] = useState<AuditLogQueryParams>({
    page: 1,
    page_size: 50,
  })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tableName, setTableName] = useState('')
  const [action, setAction] = useState<AuditAction | ''>('')
  const [recordId, setRecordId] = useState('')

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [exportReason, setExportReason] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)

  const { data, isLoading, error } = useAuditLogs(filters)
  const exportMutation = useExportAuditLogs()

  const handleApplyFilters = () => {
    setFilters({
      ...filters,
      page: 1,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      table_name: tableName || undefined,
      action: action || undefined,
      record_id: recordId || undefined,
    })
  }

  const handleClearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setTableName('')
    setAction('')
    setRecordId('')
    setFilters({
      page: 1,
      page_size: 50,
    })
  }

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage })
  }

  const handleExport = async () => {
    setExportError(null)

    if (exportReason.length < 10) {
      setExportError('Please provide a reason (at least 10 characters)')
      return
    }

    try {
      await exportMutation.mutateAsync({
        format: exportFormat,
        reason: exportReason,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        table_name: tableName || undefined,
        action: action || undefined,
      })
      setShowExportModal(false)
      setExportReason('')
    } catch (err) {
      setExportError('Failed to export audit logs')
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatChanges = (changes: Record<string, unknown>) => {
    if (!changes || Object.keys(changes).length === 0) {
      return '-'
    }
    const keys = Object.keys(changes)
    if (keys.length <= 2) {
      return keys.join(', ')
    }
    return `${keys.slice(0, 2).join(', ')} +${keys.length - 2} more`
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Complete history of all system changes"
      />

      <div className="p-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Table */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Table</label>
              <select
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Tables</option>
                {Object.entries(TABLE_NAME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as AuditAction | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Record ID */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Record ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  placeholder="Search by ID..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
            >
              Clear
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm">Failed to load audit logs</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Timestamp</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Table</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Record ID</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.items.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatTimestamp(entry.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {entry.user_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            entry.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                            entry.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {AUDIT_ACTION_LABELS[entry.action]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {TABLE_NAME_LABELS[entry.table_name] || entry.table_name}
                        </td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                          {entry.record_id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {formatChanges(entry.changes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Page {data.page} of {data.total_pages} ({data.total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(data.page - 1)}
                      disabled={data.page <= 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(data.page + 1)}
                      disabled={data.page >= data.total_pages}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Audit Logs</h3>

            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setExportFormat('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    exportFormat === 'csv'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="font-medium">CSV</span>
                </button>
                <button
                  onClick={() => setExportFormat('json')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    exportFormat === 'json'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileJson className="w-5 h-5" />
                  <span className="font-medium">JSON</span>
                </button>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Export <span className="text-red-500">*</span>
              </label>
              <textarea
                value={exportReason}
                onChange={(e) => setExportReason(e.target.value)}
                placeholder="Please provide a reason for this export (required for compliance)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be logged for compliance purposes.
              </p>
            </div>

            {/* Error */}
            {exportError && (
              <p className="mb-4 text-sm text-red-600">{exportError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowExportModal(false)
                  setExportReason('')
                  setExportError(null)
                }}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exportMutation.isPending || exportReason.length < 10}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
