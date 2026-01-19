import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ReactNode } from 'react'

interface FilterTab {
  id: string
  label: string
  count?: number
}

interface FilterDropdown {
  id: string
  label: string
  options: { value: string; label: string }[]
  value?: string
  onChange?: (value: string) => void
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  showSearch?: boolean
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filterTabs?: FilterTab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  filters?: FilterDropdown[]
  actionButton?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  showSearch = false,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filterTabs,
  activeTab,
  onTabChange,
  filters,
  actionButton,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'bg-white border-b border-gray-200 px-6 py-4',
        'min-h-page-header',
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left side - Title and subtitle */}
        <div className="flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Right side - Search, filters, action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-9 w-48 lg:w-56"
              />
            </div>
          )}

          {/* Filter tabs */}
          {filterTabs && filterTabs.length > 0 && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Dropdown filters */}
          {filters?.map((filter) => (
            <Select
              key={filter.id}
              value={filter.value}
              onValueChange={filter.onChange}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {/* Action button */}
          {actionButton && (
            <Button onClick={actionButton.onClick}>
              {actionButton.icon}
              {actionButton.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
