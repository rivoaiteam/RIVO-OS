import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useSLABreaches } from '@/hooks/useSLABreaches'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseSidePanel } from '@/components/CaseSidePanel'
import { Pagination } from '@/components/Pagination'
import {
  TablePageLayout,
  TableCard,
  TableContainer,
} from '@/components/ui/TablePageLayout'
import type { SLAType } from '@/types/sla'
import { SLA_TYPE_OPTIONS } from '@/types/sla'

export function SLABreachesPage() {
  const [slaType, setSlaType] = useState<SLAType>('all')
  const [page, setPage] = useState(1)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedCase, setSelectedCase] = useState<string | null>(null)

  const { data, isLoading, error } = useSLABreaches({ sla_type: slaType, page, page_size: 10 })

  const handleRowClick = (entityType: string, entityId: string) => {
    if (entityType === 'client') setSelectedClient(entityId)
    else if (entityType === 'case') setSelectedCase(entityId)
  }

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">SLA Breaches</h1>
          <p className="text-xs text-gray-500 mt-0.5">Monitor overdue clients and cases</p>
        </div>
      </div>

      <div className="px-6 pb-3">
        <select
          value={slaType}
          onChange={e => { setSlaType(e.target.value as SLAType); setPage(1) }}
          className="h-8 px-3 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white"
        >
          {SLA_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
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
            <span className="text-xs">Failed to load SLA breaches</span>
          </div>
        ) : (
          <>
            <TableContainer isEmpty={!data?.items.length} emptyMessage="No SLA breaches">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">SLA Type</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Assigned To</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Overdue</th>
                    <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item.entity_type, item.entity_id)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3">
                        <span className="text-xs font-medium text-gray-900">{item.entity_name}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-gray-600">{item.sla_type_display}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-gray-600">{item.assigned_to?.name ?? '\u2014'}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-red-600 font-medium">{item.overdue_display}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-xs text-gray-500">{item.last_activity_display ?? '\u2014'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {data && (
              <Pagination
                currentPage={data.page}
                totalPages={data.total_pages}
                totalItems={data.total}
                onPageChange={setPage}
                itemLabel="breaches"
              />
            )}
          </>
        )}
      </TableCard>

      {selectedClient && (
        <ClientSidePanel clientId={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
      <CaseSidePanel caseId={selectedCase} isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} />
    </TablePageLayout>
  )
}
