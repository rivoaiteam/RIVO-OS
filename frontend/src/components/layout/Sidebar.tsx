import { Link, useLocation } from 'react-router-dom'
import { Settings, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayout } from '@/contexts/LayoutContext'
import { useNavigationItems } from '@/hooks/useNavigationItems'
export function Sidebar() {
  const location = useLocation()
  const {
    sidebarCollapsed,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    isMobile,
  } = useLayout()
  const { sections, settingsItems } = useNavigationItems()

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/')

  const showSidebar = isMobile ? sidebarOpen : true

  if (!showSidebar && isMobile) {
    return null
  }

  const sidebarWidth = sidebarCollapsed && !isMobile ? 'w-[64px]' : 'w-[220px]'

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 bg-white flex flex-col',
          sidebarWidth,
          isMobile && !sidebarOpen && '-translate-x-full',
          isMobile && sidebarOpen && 'translate-x-0',
          'transition-all duration-200 ease-out'
        )}
      >
        {/* Logo header */}
        <div className="h-14 flex items-center gap-2 px-3 shrink-0">
          {/* Collapse/Menu toggle */}
          <button
            onClick={isMobile ? () => setSidebarOpen(false) : toggleSidebar}
            className="p-1.5 rounded hover:bg-gray-50 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-400" />
          </button>
          {/* Logo - hide when collapsed on desktop */}
          {(!sidebarCollapsed || isMobile) && (
            <Link to="/" className="flex items-center">
              <img src="/rivo-logo.png" alt="Rivo" className="h-6" />
            </Link>
          )}
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 overflow-y-auto py-3">
          {sections.map(section => (
            <div key={section.id} className="mb-4">
              {/* Section label */}
              {(!sidebarCollapsed || isMobile) && (
                <div className="px-4 mb-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {section.label}
                  </span>
                </div>
              )}

              {/* Nav items */}
              <div className="space-y-0.5 px-2">
                {section.items.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => isMobile && setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm transition-colors relative rounded',
                        active
                          ? 'bg-[#f5f8fa] text-[#1e3a5f] font-medium'
                          : 'hover:bg-gray-50 text-gray-600',
                        sidebarCollapsed && !isMobile && 'justify-center px-2'
                      )}
                      title={sidebarCollapsed && !isMobile ? item.label : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#1e3a5f] rounded-r" />
                      )}
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0',
                          active ? 'text-[#1e3a5f]' : 'text-gray-400'
                        )}
                      />
                      {(!sidebarCollapsed || isMobile) && (
                        <span className="flex-1">{item.label}</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings section - at bottom */}
        {settingsItems.length > 0 && (
          <div className="p-2">
            {settingsItems.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm transition-colors relative rounded',
                    active
                      ? 'bg-[#f5f8fa] text-[#1e3a5f] font-medium'
                      : 'hover:bg-gray-50 text-gray-600',
                    sidebarCollapsed && !isMobile && 'justify-center px-2'
                  )}
                  title={sidebarCollapsed && !isMobile ? item.label : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#1e3a5f] rounded-r" />
                  )}
                  <Settings
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      active ? 'text-[#1e3a5f]' : 'text-gray-400'
                    )}
                  />
                  {(!sidebarCollapsed || isMobile) && (
                    <span>{item.label}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}

      </aside>
    </>
  )
}
