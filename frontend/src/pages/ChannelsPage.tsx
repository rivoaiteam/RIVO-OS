import { useState, useEffect } from 'react'
import { Plus, Trash2, X, AlertCircle, Loader2, Search, ChevronDown, ChevronRight as ChevronRightIcon, Check } from 'lucide-react'
import {
  useChannels,
  useChannel,
  useDeleteChannel,
  useAddSource,
  useUpdateSource,
  useDeleteSource,
  useAddSubSource,
  useUpdateSubSource,
  useDeleteSubSource,
  type ChannelListItem,
  type Source,
  type SubSource,
  type SubSourceStatus,
} from '@/hooks/useChannels'
import { cn } from '@/lib/utils'
import { ChannelSidePanel } from '@/components/ChannelSidePanel'
import { Pagination } from '@/components/Pagination'
import { TablePageLayout, TableCard, TableContainer, PageLoading, PageError, StatusErrorToast } from '@/components/ui/TablePageLayout'

const PAGE_SIZE = 10

const TYPE_TABS: { value: 'all' | 'trusted' | 'untrusted'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'trusted', label: 'Trusted' },
  { value: 'untrusted', label: 'Untrusted' },
]

export function ChannelsPage() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [trustFilter, setTrustFilter] = useState<'all' | 'trusted' | 'untrusted'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set())

  // Edit panel state
  const [editingSource, setEditingSource] = useState<{ source: Source; isTrusted: boolean } | null>(null)
  const [editingSubSource, setEditingSubSource] = useState<{ subSource: SubSource; isTrusted: boolean } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: channelsData, isLoading, error } = useChannels()
  const deleteChannelMutation = useDeleteChannel()

  const allChannels = Array.isArray(channelsData) ? channelsData : []
  const filteredChannels = allChannels.filter(channel => {
    const matchesSearch = !searchQuery ||
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTrust = trustFilter === 'all' ||
      (trustFilter === 'trusted' && channel.is_trusted) ||
      (trustFilter === 'untrusted' && !channel.is_trusted)
    return matchesSearch && matchesTrust
  })

  const totalItems = filteredChannels.length
  const totalPages = Math.ceil(totalItems / PAGE_SIZE)
  const paginatedChannels = filteredChannels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const toggleChannel = (id: string) => {
    setExpandedChannels(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteChannel = async (channel: ChannelListItem) => {
    if (window.confirm(`Delete "${channel.name}"?`)) {
      try {
        await deleteChannelMutation.mutateAsync(channel.id)
        setExpandedChannels(prev => { const n = new Set(prev); n.delete(channel.id); return n })
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : 'Failed to delete')
      }
    }
  }

  if (isLoading) return <PageLoading />
  if (error) return <PageError entityName="channels" message={error.message} />

  return (
    <TablePageLayout>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Channels</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage lead sources and attribution</p>
          </div>
          <button onClick={() => setSelectedChannelId('new')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New Channel
          </button>
        </div>

        {/* Search and Type Tabs */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input type="text" placeholder="Search channels..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full h-8 pl-4 pr-3 text-xs border border-gray-200 rounded-lg focus:outline-none" />
          </div>
          <div className="flex items-center gap-1 border-b border-gray-200">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setTrustFilter(tab.value); setCurrentPage(1) }}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                  trustFilter === tab.value
                    ? 'border-[#1e3a5f] text-[#1e3a5f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {statusError && (
        <StatusErrorToast message={statusError} onClose={() => setStatusError(null)} />
      )}

      <TableCard>
        <TableContainer isEmpty={paginatedChannels.length === 0} emptyMessage="No channels found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-8 pb-3"></th>
                <th className="w-[50%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                <th className="w-[30%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">First Contact SLA</th>
                <th className="w-[12%] text-right pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedChannels.map((channel) => (
                <ChannelRowWithNested
                  key={channel.id}
                  channel={channel}
                  isExpanded={expandedChannels.has(channel.id)}
                  onToggle={() => toggleChannel(channel.id)}
                  onEditChannel={() => setSelectedChannelId(channel.id)}
                  onEditSource={(source) => setEditingSource({ source, isTrusted: channel.is_trusted })}
                  onEditSubSource={(subSource) => setEditingSubSource({ subSource, isTrusted: channel.is_trusted })}
                  onDelete={() => handleDeleteChannel(channel)}
                  onError={(msg) => setStatusError(msg)}
                />
              ))}
            </tbody>
          </table>
        </TableContainer>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          itemLabel="channels"
        />
      </TableCard>

      {/* Channel Side Panel (for channel only) */}
      {selectedChannelId && (
        <ChannelSidePanel
          channelId={selectedChannelId}
          onClose={() => setSelectedChannelId(null)}
        />
      )}

      {/* Source Edit Panel */}
      {editingSource && (
        <SourceEditPanel
          source={editingSource.source}
          onClose={() => setEditingSource(null)}
        />
      )}

      {/* Sub-source Edit Panel */}
      {editingSubSource && (
        <SubSourceEditPanel
          subSource={editingSubSource.subSource}
          isTrusted={editingSubSource.isTrusted}
          onClose={() => setEditingSubSource(null)}
        />
      )}
    </TablePageLayout>
  )
}

function ChannelRowWithNested({
  channel, isExpanded, onToggle, onEditChannel, onEditSource, onEditSubSource, onDelete, onError
}: {
  channel: ChannelListItem
  isExpanded: boolean
  onToggle: () => void
  onEditChannel: () => void
  onEditSource: (source: Source) => void
  onEditSubSource: (subSource: SubSource) => void
  onDelete: () => void
  onError: (msg: string) => void
}) {
  const { data: fullChannel } = useChannel(isExpanded ? channel.id : '')
  const [showAddSource, setShowAddSource] = useState(false)

  return (
    <>
      {/* Channel Row */}
      <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
        <td className="py-3">
          <button onClick={onToggle} className="p-1 text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
          </button>
        </td>
        <td className="py-3 cursor-pointer" onClick={onEditChannel}>
          <span className="text-xs font-medium text-gray-900 hover:text-[#1e3a5f]">{channel.name}</span>
        </td>
        <td className="py-3">
          <span className="text-xs text-gray-500">
            {channel.default_sla_minutes ? `${channel.default_sla_minutes} min` : '—'}
          </span>
        </td>
        <td className="py-3 text-right">
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>

      {/* Expanded: Sources */}
      {isExpanded && fullChannel && (
        <>
          {/* Add Source Row */}
          {showAddSource ? (
            <InlineAddSourceRow
              channelId={channel.id}
              onSuccess={() => setShowAddSource(false)}
              onCancel={() => setShowAddSource(false)}
              onError={onError}
            />
          ) : (
            <tr className="bg-slate-50/50 border-b border-gray-100">
              <td className="py-2 pl-4">
                <span className="text-gray-300">└</span>
              </td>
              <td className="py-2" colSpan={3}>
                <button onClick={() => setShowAddSource(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <Plus className="h-3.5 w-3.5" />
                  Add Source
                </button>
              </td>
            </tr>
          )}

          {/* Source Rows */}
          {fullChannel.sources.map((source) => (
            <SourceRowWithNested
              key={source.id}
              source={source}
              isTrusted={channel.is_trusted}
              onEditSource={onEditSource}
              onEditSubSource={onEditSubSource}
              onError={onError}
            />
          ))}
        </>
      )}
    </>
  )
}

function InlineAddSourceRow({
  channelId, onSuccess, onCancel, onError
}: {
  channelId: string
  onSuccess: () => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const addMutation = useAddSource()

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      await addMutation.mutateAsync({ channelId, name: name.trim() })
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add source')
    }
  }

  return (
    <tr className="bg-slate-50/70 border-b border-gray-100">
      <td className="py-2 pl-4">
        <span className="text-gray-300">└</span>
      </td>
      <td className="py-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Source name"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full h-7 px-2 text-xs border border-gray-200 rounded focus:outline-none bg-white"
        />
      </td>
      <td className="py-2"></td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={handleSave} disabled={addMutation.isPending || !name.trim()} className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-40">
            {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function SourceRowWithNested({
  source, isTrusted, onEditSource, onEditSubSource, onError
}: {
  source: Source
  isTrusted: boolean
  onEditSource: (source: Source) => void
  onEditSubSource: (subSource: SubSource) => void
  onError: (msg: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showAddSubSource, setShowAddSubSource] = useState(false)
  const deleteMutation = useDeleteSource()

  const handleDelete = async () => {
    if (window.confirm(`Delete source "${source.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(source.id)
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to delete')
      }
    }
  }

  return (
    <>
      {/* Source Row */}
      <tr className="bg-slate-50/70 border-b border-gray-100 hover:bg-slate-100/80 transition-colors">
        <td className="py-2 pl-4">
          <div className="flex items-center gap-1">
            <span className="text-gray-300">└</span>
            <button onClick={() => setExpanded(!expanded)} className="p-1 text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
        <td className="py-2 cursor-pointer" onClick={() => onEditSource(source)}>
          <span className="text-xs font-medium text-gray-700 hover:text-[#1e3a5f]">{source.name}</span>
        </td>
        <td className="py-2">
          <span className="text-xs text-gray-500">
            {source.sla_minutes ? `${source.sla_minutes} min` : source.effective_sla ? `${source.effective_sla} min` : '—'}
          </span>
        </td>
        <td className="py-2 text-right">
          <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>

      {/* Expanded: Sub-sources */}
      {expanded && (
        <>
          {/* Add Sub-source Row */}
          {showAddSubSource ? (
            <InlineAddSubSourceRow
              sourceId={source.id}
              isTrusted={isTrusted}
              onSuccess={() => setShowAddSubSource(false)}
              onCancel={() => setShowAddSubSource(false)}
              onError={onError}
            />
          ) : (
            <tr className="bg-slate-100/40 border-b border-gray-100">
              <td className="py-2 pl-8">
                <span className="text-gray-300">└</span>
              </td>
              <td className="py-2" colSpan={3}>
                <button onClick={() => setShowAddSubSource(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <Plus className="h-3.5 w-3.5" />
                  Add Sub-source
                </button>
              </td>
            </tr>
          )}

          {/* Sub-source Rows */}
          {source.sub_sources.map((ss) => (
            <SubSourceRow key={ss.id} subSource={ss} onEdit={() => onEditSubSource(ss)} onError={onError} />
          ))}
        </>
      )}
    </>
  )
}

function InlineAddSubSourceRow({
  sourceId, isTrusted, onSuccess, onCancel, onError
}: {
  sourceId: string
  isTrusted: boolean
  onSuccess: () => void
  onCancel: () => void
  onError: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const addMutation = useAddSubSource()

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      await addMutation.mutateAsync({
        sourceId,
        data: { name: name.trim(), status: isTrusted ? 'active' : 'incubation' }
      })
      onSuccess()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to add sub-source')
    }
  }

  return (
    <tr className="bg-slate-100/60 border-b border-gray-100">
      <td className="py-2 pl-8">
        <span className="text-gray-300">└</span>
      </td>
      <td className="py-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sub-source name"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full h-7 px-2 text-xs border border-gray-200 rounded focus:outline-none bg-white"
        />
      </td>
      <td className="py-2"></td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={handleSave} disabled={addMutation.isPending || !name.trim()} className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-40">
            {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function SubSourceRow({
  subSource, onEdit, onError
}: {
  subSource: SubSource
  onEdit: () => void
  onError: (msg: string) => void
}) {
  const deleteMutation = useDeleteSubSource()

  const handleDelete = async () => {
    if (window.confirm(`Delete "${subSource.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(subSource.id)
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Failed to delete')
      }
    }
  }

  return (
    <tr className="bg-slate-100/60 border-b border-gray-100 hover:bg-slate-100 transition-colors">
      <td className="py-2 pl-8">
        <span className="text-gray-300">└</span>
      </td>
      <td className="py-2 cursor-pointer" onClick={onEdit}>
        <span className="text-xs font-medium text-gray-600 hover:text-[#1e3a5f]">{subSource.name}</span>
      </td>
      <td className="py-2">
        <span className="text-xs text-gray-500">
          {subSource.sla_minutes ? `${subSource.sla_minutes} min` : subSource.effective_sla ? `${subSource.effective_sla} min` : '—'}
        </span>
      </td>
      <td className="py-2 text-right">
        <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// Source Edit Panel
function SourceEditPanel({ source, onClose }: { source: Source; onClose: () => void }) {
  const [name, setName] = useState(source.name)
  const [sla, setSla] = useState(source.sla_minutes?.toString() || '')
  const [saveError, setSaveError] = useState<string | null>(null)

  const updateMutation = useUpdateSource()

  const handleSlaChange = (value: string) => {
    const num = parseInt(value)
    if (value === '' || (num >= 0 && !isNaN(num))) {
      setSla(value)
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    if (!name.trim()) {
      setSaveError('Name is required')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: source.id,
        data: { name: name.trim(), sla_minutes: sla ? parseInt(sla) : null }
      })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[350px] bg-white shadow-xl z-50 flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Edit Source</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {saveError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder="Source name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First Contact SLA (minutes)</label>
            <input
              type="number"
              value={sla}
              onChange={(e) => handleSlaChange(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder={source.effective_sla ? `${source.effective_sla}` : ''}
              min="0"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 text-xs bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Sub-source Edit Panel
function SubSourceEditPanel({ subSource, isTrusted, onClose }: { subSource: SubSource; isTrusted: boolean; onClose: () => void }) {
  const [name, setName] = useState(subSource.name)
  const [sla, setSla] = useState(subSource.sla_minutes?.toString() || '')
  const [status, setStatus] = useState<SubSourceStatus>(subSource.status)
  const [saveError, setSaveError] = useState<string | null>(null)

  const updateMutation = useUpdateSubSource()

  const handleSlaChange = (value: string) => {
    const num = parseInt(value)
    if (value === '' || (num >= 0 && !isNaN(num))) {
      setSla(value)
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    if (!name.trim()) {
      setSaveError('Name is required')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: subSource.id,
        data: { name: name.trim(), sla_minutes: sla ? parseInt(sla) : null, status }
      })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const statusOptions = isTrusted
    ? [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]
    : [{ value: 'incubation', label: 'Incubation' }, { value: 'live', label: 'Live' }, { value: 'paused', label: 'Paused' }]

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[350px] bg-white shadow-xl z-50 flex flex-col">
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Edit Sub-source</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {saveError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder="Sub-source name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First Contact SLA (minutes)</label>
            <input
              type="number"
              value={sla}
              onChange={(e) => handleSlaChange(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              placeholder={subSource.effective_sla ? `${subSource.effective_sla}` : ''}
              min="0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubSourceStatus)}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 px-4 py-2 text-xs bg-[#1e3a5f] text-white rounded-lg hover:bg-[#0f2744] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
