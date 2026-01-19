import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavItem as NavItemType } from '@/config/navigation'
import { useLayout } from '@/contexts/LayoutContext'

interface NavItemProps {
  item: NavItemType
  collapsed?: boolean
}

export function NavItem({ item, collapsed = false }: NavItemProps) {
  const location = useLocation()
  const { setSidebarOpen, isMobile } = useLayout()
  const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
  const Icon = item.icon

  const handleClick = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <Link
      to={item.href}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
        'hover:bg-gray-100',
        isActive && 'bg-blue-50 border border-blue-100',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon
        className={cn(
          'h-5 w-5 flex-shrink-0',
          isActive ? 'text-orange-500' : 'text-orange-400'
        )}
      />
      {!collapsed && (
        <span className={cn('text-gray-700', isActive && 'text-gray-900')}>
          {item.label}
        </span>
      )}
    </Link>
  )
}
