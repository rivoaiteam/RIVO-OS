import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { UserCog, Radio, Building2, FileText, Clock, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { useStageSLAConfigs, useUpdateStageSLAConfig, useClientToCaseSLAConfig, useUpdateClientToCaseSLAConfig } from '@/hooks/useCases'

const settingsSections = [
  { id: 'users', label: 'Users & Roles', href: '/settings/users', icon: UserCog },
  { id: 'channels', label: 'Channels', href: '/settings/channels', icon: Radio },
  { id: 'bank-products', label: 'Bank Products', href: '/settings/bank-products', icon: Building2 },
  { id: 'templates', label: 'Templates', href: '/settings/templates', icon: FileText },
  { id: 'sla', label: 'SLA Config', href: '/settings/sla', icon: Clock },
]

export function SettingsPage() {
  const location = useLocation()
  const currentSection = settingsSections.find(s => location.pathname.startsWith(s.href))

  return (
    <div className="h-full">
      <PageHeader
        title="Settings"
        subtitle="Manage system configuration"
      />

      <div className="flex">
        {/* Settings sidebar */}
        <div className="w-64 border-r border-gray-200 bg-white min-h-[calc(100vh-var(--header-height)-var(--page-header-height))]">
          <nav className="p-4 space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon
              const isActive = location.pathname.startsWith(section.href)
              return (
                <Link
                  key={section.id}
                  to={section.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-gray-400')} />
                  {section.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Settings content */}
        <div className="flex-1 p-6">
          <Outlet />
          {!currentSection && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900">Select a section</h3>
              <p className="text-gray-500 mt-1">Choose a settings section from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function UsersSettingsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Users & Roles</h2>
      <p className="text-gray-500">Manage user accounts and role assignments.</p>
      <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-500">User management interface will be implemented here.</p>
      </div>
    </div>
  )
}

export function ChannelsSettingsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Channels</h2>
      <p className="text-gray-500">Configure communication channels.</p>
    </div>
  )
}

export function BankProductsSettingsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Products</h2>
      <p className="text-gray-500">Manage bank product configurations.</p>
    </div>
  )
}

export function TemplatesSettingsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Templates</h2>
      <p className="text-gray-500">Manage message and document templates.</p>
    </div>
  )
}

export function SLASettingsPage() {
  const { data: configs, isLoading, error } = useStageSLAConfigs()
  const { data: clientToCaseConfig, isLoading: isLoadingClientToCase } = useClientToCaseSLAConfig()
  const updateMutation = useUpdateStageSLAConfig()
  const updateClientToCaseMutation = useUpdateClientToCaseSLAConfig()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editField, setEditField] = useState<'sla' | 'breach'>('sla')
  const [editValue, setEditValue] = useState<string>('')
  const [editingClientToCase, setEditingClientToCase] = useState<'sla' | 'breach' | null>(null)
  const [clientToCaseValue, setClientToCaseValue] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const clientToCaseInputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId, editField])

  useEffect(() => {
    if (editingClientToCase && clientToCaseInputRef.current) {
      clientToCaseInputRef.current.focus()
      clientToCaseInputRef.current.select()
    }
  }, [editingClientToCase])

  const handleEditSla = (id: string, currentHours: number) => {
    setEditingId(id)
    setEditField('sla')
    setEditValue(String(hoursToDays(currentHours)))
  }

  const handleEditBreach = (id: string, currentPercent: number) => {
    setEditingId(id)
    setEditField('breach')
    setEditValue(String(currentPercent))
  }

  const handleSave = async (id: string) => {
    const numValue = parseInt(editValue) || 0
    if (numValue > 0) {
      if (editField === 'sla') {
        await updateMutation.mutateAsync({ id, sla_hours: daysToHours(numValue) })
      } else {
        await updateMutation.mutateAsync({ id, breach_percent: numValue })
      }
    }
    setEditingId(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSave(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditValue('')
    }
  }

  const handleSaveClientToCase = async () => {
    const numValue = parseInt(clientToCaseValue) || 0
    if (clientToCaseConfig && numValue > 0) {
      if (editingClientToCase === 'sla') {
        await updateClientToCaseMutation.mutateAsync({ id: clientToCaseConfig.id, sla_hours: daysToHours(numValue) })
      } else {
        await updateClientToCaseMutation.mutateAsync({ id: clientToCaseConfig.id, breach_percent: numValue })
      }
    }
    setEditingClientToCase(null)
    setClientToCaseValue('')
  }

  const handleClientToCaseKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveClientToCase()
    } else if (e.key === 'Escape') {
      setEditingClientToCase(null)
      setClientToCaseValue('')
    }
  }

  const formatDays = (hours: number) => {
    const days = Math.round(hours / 24)
    return `${days}d`
  }

  const hoursToDays = (hours: number) => Math.round(hours / 24)
  const daysToHours = (days: number) => days * 24

  if (isLoading || isLoadingClientToCase) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load SLA configurations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Page Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">SLA Configuration</h1>
            <p className="text-xs text-gray-500 mt-0.5">Configure time limits for client and case workflows</p>
          </div>
        </div>
      </div>

      {/* Client to Case SLA Card */}
      {clientToCaseConfig && (
        <div className="mx-6 mb-4 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-900">Client First Contact to Case SLA</h2>
            <p className="text-xs text-gray-500 mt-0.5">Time allowed from first contact until case created or client closed</p>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">SLA:</span>
                {editingClientToCase === 'sla' ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={clientToCaseInputRef}
                      type="number"
                      min="1"
                      value={clientToCaseValue}
                      onChange={(e) => setClientToCaseValue(e.target.value)}
                      onKeyDown={handleClientToCaseKeyDown}
                      onBlur={handleSaveClientToCase}
                      className="w-16 h-7 px-2 text-xs border border-[#1e3a5f] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                    <span className="text-xs text-gray-400">days</span>
                    {updateClientToCaseMutation.isPending && (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    )}
                  </div>
                ) : (
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded bg-[#e8f0f5] text-[#1e3a5f] cursor-pointer hover:bg-[#d0e3ed]"
                    onClick={() => {
                      setEditingClientToCase('sla')
                      setClientToCaseValue(String(hoursToDays(clientToCaseConfig.sla_hours)))
                    }}
                  >
                    {formatDays(clientToCaseConfig.sla_hours)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Breach %:</span>
                {editingClientToCase === 'breach' ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={clientToCaseInputRef}
                      type="number"
                      min="100"
                      max="300"
                      value={clientToCaseValue}
                      onChange={(e) => setClientToCaseValue(e.target.value)}
                      onKeyDown={handleClientToCaseKeyDown}
                      onBlur={handleSaveClientToCase}
                      className="w-16 h-7 px-2 text-xs border border-[#1e3a5f] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                    <span className="text-xs text-gray-400">%</span>
                    {updateClientToCaseMutation.isPending && (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    )}
                  </div>
                ) : (
                  <span
                    className="text-xs text-gray-600 cursor-pointer hover:text-[#1e3a5f]"
                    onClick={() => {
                      setEditingClientToCase('breach')
                      setClientToCaseValue(String(clientToCaseConfig.breach_percent))
                    }}
                  >
                    {clientToCaseConfig.breach_percent}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage SLA Header */}
      <div className="px-6 py-2">
        <h2 className="text-xs font-semibold text-gray-900">Stage SLA Configuration</h2>
        <p className="text-xs text-gray-500 mt-0.5">Time limits for each case stage transition</p>
      </div>

      {/* SLA Table Card */}
      <div className="mx-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 pt-4">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-[35%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">From Stage</th>
                <th className="w-[35%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">To Stage</th>
                <th className="w-[15%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">SLA (Days)</th>
                <th className="w-[15%] text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Breach %</th>
              </tr>
            </thead>
            <tbody>
              {configs?.map((config) => (
                <tr
                  key={config.id}
                  className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-3">
                    <span className="text-xs font-medium text-gray-900">{config.from_stage_display}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-600">{config.to_stage_display}</span>
                  </td>
                  <td className="py-3">
                    {editingId === config.id && editField === 'sla' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={inputRef}
                          type="number"
                          min="1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, config.id)}
                          onBlur={() => handleSave(config.id)}
                          className="w-16 h-7 px-2 text-xs border border-[#1e3a5f] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                        />
                        <span className="text-xs text-gray-400">days</span>
                        {updateMutation.isPending && (
                          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                        )}
                      </div>
                    ) : (
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded bg-[#e8f0f5] text-[#1e3a5f] cursor-pointer hover:bg-[#d0e3ed]"
                        onClick={() => handleEditSla(config.id, config.sla_hours)}
                      >
                        {formatDays(config.sla_hours)}
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    {editingId === config.id && editField === 'breach' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={inputRef}
                          type="number"
                          min="100"
                          max="300"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, config.id)}
                          onBlur={() => handleSave(config.id)}
                          className="w-16 h-7 px-2 text-xs border border-[#1e3a5f] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                        />
                        <span className="text-xs text-gray-400">%</span>
                        {updateMutation.isPending && (
                          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                        )}
                      </div>
                    ) : (
                      <span
                        className="text-xs text-gray-600 cursor-pointer hover:text-[#1e3a5f]"
                        onClick={() => handleEditBreach(config.id, config.breach_percent)}
                      >
                        {config.breach_percent}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Breach % = when to escalate to manager (e.g., 120% means escalate when 20% past SLA). Hold stage pauses the timer.
          </p>
        </div>
      </div>
    </div>
  )
}
