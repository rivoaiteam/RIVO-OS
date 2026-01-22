import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useLayout } from '@/contexts/LayoutContext'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isMobile, sidebarCollapsed } = useLayout()

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 64 : 220

  return (
    <div className="h-screen bg-white overflow-hidden">
      {/* Sidebar - fixed left, full height */}
      <Sidebar />

      {/* Main area - to the right of sidebar */}
      <div
        className="h-screen flex flex-col transition-[margin] duration-200 ease-out"
        style={{
          marginLeft: `${sidebarWidth}px`,
        }}
      >
        {/* Header */}
        <Header />

        {/* Main Content with rounded top corners */}
        <main className="flex-1 overflow-auto bg-[#f8f9fb] rounded-tl-xl flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}
