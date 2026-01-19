import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface LayoutContextType {
  sidebarCollapsed: boolean
  sidebarOpen: boolean
  sidePanelOpen: boolean
  sidePanelContent: ReactNode | null
  sidePanelTitle: string
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarOpen: (open: boolean) => void
  openSidePanel: (title: string, content: ReactNode) => void
  closeSidePanel: () => void
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

const SIDEBAR_COLLAPSED_KEY = 'rivo-sidebar-collapsed'

interface LayoutProviderProps {
  children: ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      return stored === 'true'
    }
    return false
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [sidePanelContent, setSidePanelContent] = useState<ReactNode | null>(null)
  const [sidePanelTitle, setSidePanelTitle] = useState('')
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  const isMobile = windowWidth < 768
  const isTablet = windowWidth >= 768 && windowWidth < 1024
  const isDesktop = windowWidth >= 1024

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isTablet && !sidebarCollapsed) {
      setSidebarCollapsedState(true)
    }
  }, [isTablet, sidebarCollapsed])

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [isMobile])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [])

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(prev => !prev)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }, [isMobile, sidebarCollapsed, setSidebarCollapsed])

  const openSidePanel = useCallback((title: string, content: ReactNode) => {
    setSidePanelTitle(title)
    setSidePanelContent(content)
    setSidePanelOpen(true)
  }, [])

  const closeSidePanel = useCallback(() => {
    setSidePanelOpen(false)
    setSidePanelContent(null)
    setSidePanelTitle('')
  }, [])

  return (
    <LayoutContext.Provider
      value={{
        sidebarCollapsed,
        sidebarOpen,
        sidePanelOpen,
        sidePanelContent,
        sidePanelTitle,
        toggleSidebar,
        setSidebarCollapsed,
        setSidebarOpen,
        openSidePanel,
        closeSidePanel,
        isMobile,
        isTablet,
        isDesktop,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}
