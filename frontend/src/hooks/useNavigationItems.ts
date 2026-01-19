import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getNavigationSections, getSettingsItems, type NavSection, type NavItem } from '@/config/navigation'

interface UseNavigationItemsResult {
  sections: NavSection[]
  settingsItems: NavItem[]
  hasNavigation: boolean
}

export function useNavigationItems(): UseNavigationItemsResult {
  const { user } = useAuth()

  const result = useMemo(() => {
    if (!user) {
      return {
        sections: [],
        settingsItems: [],
        hasNavigation: false,
      }
    }

    const sections = getNavigationSections(user.role)
    const settings = getSettingsItems(user.role)

    return {
      sections,
      settingsItems: settings,
      hasNavigation: sections.length > 0 || settings.length > 0,
    }
  }, [user])

  return result
}
