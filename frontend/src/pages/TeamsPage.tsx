import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TablePageLayout, TableCard, TableContainer, PageLoading } from '@/components/ui/TablePageLayout'

interface TeamMember {
  id: string
  name: string
}

interface TeamData {
  id: string
  name: string
  channel_name?: string
  channel_id?: string
  team_leader: TeamMember | null
  mortgage_specialist: TeamMember | null
  process_officer: TeamMember | null
}

interface ChannelNode {
  id: string
  name: string
  teams: TeamData[]
}

interface OwnerNode {
  id: string | null
  name: string
  channels: ChannelNode[]
}

interface UserOption {
  id: string
  name: string
  role: string
}

interface TeamForm {
  name: string
  channel: string
  team_leader: string
  mortgage_specialist: string
  process_officer: string
}

const emptyForm: TeamForm = { name: '', channel: '', team_leader: '', mortgage_specialist: '', process_officer: '' }

// Flatten org chart into a flat team list for the table
function flattenTeams(orgData: OwnerNode[]): (TeamData & { owner_name: string; channel_name: string; channel_id: string })[] {
  const result: (TeamData & { owner_name: string; channel_name: string; channel_id: string })[] = []
  for (const owner of orgData) {
    for (const channel of owner.channels) {
      for (const team of channel.teams) {
        result.push({ ...team, owner_name: owner.name, channel_name: channel.name, channel_id: channel.id })
      }
    }
  }
  return result
}

// Collect all channels for the dropdown
function collectChannels(orgData: OwnerNode[]): { id: string; name: string }[] {
  const channels: { id: string; name: string }[] = []
  for (const owner of orgData) {
    for (const channel of owner.channels) {
      channels.push({ id: channel.id, name: channel.name })
    }
  }
  return channels
}

export default function TeamsPage() {
  const { can } = useAuth()
  const [orgData, setOrgData] = useState<OwnerNode[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [form, setForm] = useState<TeamForm>(emptyForm)

  const canManageTeams = can('create', 'teams')

  const fetchData = () => {
    Promise.all([
      api.get<OwnerNode[]>('/teams/org_chart/'),
      canManageTeams
        ? api.get<{ items: UserOption[] }>('/users/', { page_size: 200, status: 'active' })
        : Promise.resolve({ items: [] }),
    ])
      .then(([org, usersRes]) => {
        setOrgData(org)
        setUsers(usersRes.items || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const teams = flattenTeams(orgData)
  const channels = collectChannels(orgData)
  const tlUsers = users.filter(u => u.role === 'team_leader')
  const msUsers = users.filter(u => u.role === 'mortgage_specialist')
  const poUsers = users.filter(u => u.role === 'process_officer')

  const handleAdd = () => {
    setShowForm(true)
    setEditingTeam(null)
    setForm(emptyForm)
  }

  const handleEdit = (team: TeamData & { channel_id: string }) => {
    setEditingTeam(team.id)
    setShowForm(true)
    setForm({
      name: team.name,
      channel: team.channel_id,
      team_leader: team.team_leader?.id || '',
      mortgage_specialist: team.mortgage_specialist?.id || '',
      process_officer: team.process_officer?.id || '',
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingTeam(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.channel) return
    const payload: Record<string, string | null> = {
      name: form.name,
      channel: form.channel,
      team_leader: form.team_leader || null,
      mortgage_specialist: form.mortgage_specialist || null,
      process_officer: form.process_officer || null,
    }
    try {
      if (editingTeam) {
        await api.patch(`/teams/${editingTeam}/`, payload)
      } else {
        await api.post('/teams/', payload)
      }
      handleCancel()
      setLoading(true)
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (teamId: string) => {
    if (!window.confirm('Delete this team?')) return
    try {
      await api.delete(`/teams/${teamId}/`)
      setLoading(true)
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <PageLoading />

  return (
    <TablePageLayout>
      {/* Header */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Teams</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage team assignments and structure</p>
          </div>
          {canManageTeams && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a5f] hover:bg-[#0f2744] rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Team
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <TableCard>
        <TableContainer isEmpty={teams.length === 0 && !showForm} emptyMessage="No teams found">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Team</th>
                <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Channel</th>
                <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Team Leader</th>
                <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Mortgage Specialist</th>
                <th className="w-1/5 text-left pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Process Executive</th>
                <th className="w-12 text-right pb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Inline form row */}
              {showForm && (
                <tr className="border-b border-blue-100 bg-blue-50/30">
                  <td className="py-2.5 pr-2">
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Team name"
                      autoFocus
                      className="w-full h-8 px-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                    />
                  </td>
                  <td className="py-2.5 pr-2">
                    <select
                      value={form.channel}
                      onChange={e => setForm({ ...form, channel: e.target.value })}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                    >
                      <option value="">Select...</option>
                      {channels.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 pr-2">
                    <select
                      value={form.team_leader}
                      onChange={e => setForm({ ...form, team_leader: e.target.value })}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                    >
                      <option value="">Select...</option>
                      {tlUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 pr-2">
                    <select
                      value={form.mortgage_specialist}
                      onChange={e => setForm({ ...form, mortgage_specialist: e.target.value })}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                    >
                      <option value="">Select...</option>
                      {msUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 pr-2">
                    <select
                      value={form.process_officer}
                      onChange={e => setForm({ ...form, process_officer: e.target.value })}
                      className="w-full h-8 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                    >
                      <option value="">Select...</option>
                      {poUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={handleSave}
                        disabled={!form.name.trim() || !form.channel}
                        className="p-1.5 text-green-600 hover:bg-green-100 rounded disabled:opacity-40 transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={handleCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {teams.map(team => (
                <tr key={team.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3">
                    <span className="text-xs font-medium text-gray-900">{team.name}</span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-gray-600">{team.channel_name}</span>
                  </td>
                  <td className="py-3">
                    <MemberCell name={team.team_leader?.name} />
                  </td>
                  <td className="py-3">
                    <MemberCell name={team.mortgage_specialist?.name} />
                  </td>
                  <td className="py-3">
                    <MemberCell name={team.process_officer?.name} />
                  </td>
                  <td className="py-3 text-right">
                    {canManageTeams && (
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => handleEdit(team)} className="p-1.5 text-gray-400 hover:text-[#1e3a5f] hover:bg-gray-100 rounded transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(team.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      </TableCard>
    </TablePageLayout>
  )
}

function MemberCell({ name }: { name?: string }) {
  return (
    <span className={cn('text-xs', name ? 'text-gray-700' : 'text-gray-300')}>
      {name ?? '\u2014'}
    </span>
  )
}
