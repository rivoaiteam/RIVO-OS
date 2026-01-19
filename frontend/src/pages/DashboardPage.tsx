import { PageHeader } from '@/components/layout/PageHeader'
import { WhatsNextSection } from '@/components/activity'

export function DashboardPage() {
  const handleNavigate = (type: 'client' | 'case' | 'lead', id: string) => {
    console.log(`Navigate to ${type}s/${id}`)
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back to Rivo OS"
      />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stats Cards */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Active Leads</div>
            <div className="text-3xl font-bold text-gray-900">124</div>
            <div className="text-sm text-green-600 mt-2">+12% from last month</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Open Cases</div>
            <div className="text-3xl font-bold text-gray-900">67</div>
            <div className="text-sm text-blue-600 mt-2">23 pending approval</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">This Month's Disbursement</div>
            <div className="text-3xl font-bold text-gray-900">AED 12.4M</div>
            <div className="text-sm text-green-600 mt-2">+8% from last month</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Conversion Rate</div>
            <div className="text-3xl font-bold text-gray-900">34.2%</div>
            <div className="text-sm text-orange-600 mt-2">-2% from last month</div>
          </div>
        </div>

        {/* What's Next and Recent Activity */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* What's Next Section */}
          <WhatsNextSection onNavigate={handleNavigate} />

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { action: 'New lead added', client: 'Mohammed Hassan', time: '5 min ago', type: 'create' },
                { action: 'Case approved', client: 'Priya Sharma', time: '12 min ago', type: 'success' },
                { action: 'Document uploaded', client: 'James Thompson', time: '25 min ago', type: 'update' },
                { action: 'Lead qualified', client: 'Fatima Al Hashimi', time: '1 hour ago', type: 'success' },
                { action: 'New lead assigned', client: 'Raj Patel', time: '2 hours ago', type: 'create' },
              ].map((item, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      item.type === 'success' ? 'bg-green-500' :
                      item.type === 'create' ? 'bg-blue-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="text-sm text-gray-900">{item.action}</p>
                      <p className="text-xs text-gray-500">{item.client}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
