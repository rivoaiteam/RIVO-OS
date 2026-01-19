import type { UserRole } from '@/types/auth'
import {
  Users,
  Briefcase,
  MessageCircle,
  Building2,
  LayoutDashboard,
  UserCog,
  Radio,
  FileText,
  Clock,
  Megaphone,
  Building,
  UserCheck,
  Coins,
  TrendingUp,
  Activity,
  Filter,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  roles: UserRole[]
  section?: string
  children?: NavItem[]
  /** Optional: show a badge with dynamic count (used for SLA Breaches) */
  showBadge?: boolean
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

// Define all navigation items by role
const adminItems: NavItem[] = [
  { id: 'users-roles', label: 'Users & Roles', href: '/settings/users', icon: UserCog, roles: ['admin'], section: 'settings' },
  { id: 'channels', label: 'Channels', href: '/settings/channels', icon: Radio, roles: ['admin'], section: 'settings' },
  { id: 'bank-products-settings', label: 'Bank Products', href: '/settings/bank-products', icon: Building2, roles: ['admin'], section: 'settings' },
  { id: 'templates', label: 'Templates', href: '/settings/templates', icon: FileText, roles: ['admin'], section: 'settings' },
  { id: 'sla-config', label: 'SLA Config', href: '/settings/sla', icon: Clock, roles: ['admin'], section: 'settings' },
]

const managerWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['manager'], section: 'workspace' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: Users, roles: ['manager'], section: 'workspace' },
  { id: 'clients', label: 'Clients', href: '/clients', icon: UserCheck, roles: ['manager'], section: 'workspace' },
  { id: 'cases', label: 'Cases', href: '/cases', icon: Briefcase, roles: ['manager'], section: 'workspace' },
  { id: 'campaigns', label: 'Campaigns', href: '/campaigns', icon: Megaphone, roles: ['manager'], section: 'workspace' },
  { id: 'agencies', label: 'Agencies', href: '/agencies', icon: Building, roles: ['manager'], section: 'workspace' },
  { id: 'agents', label: 'Agents', href: '/agents', icon: UserCheck, roles: ['manager'], section: 'workspace' },
  { id: 'commissions', label: 'Commissions', href: '/commissions', icon: Coins, roles: ['manager'], section: 'workspace' },
]

const managerAnalytics: NavItem[] = [
  { id: 'team-performance', label: 'Team Performance', href: '/analytics/team', icon: TrendingUp, roles: ['manager'], section: 'analytics' },
  { id: 'channel-health', label: 'Channel Health', href: '/analytics/channels', icon: Activity, roles: ['manager'], section: 'analytics' },
  { id: 'conversion-funnel', label: 'Conversion Funnel', href: '/analytics/funnel', icon: Filter, roles: ['manager'], section: 'analytics' },
  { id: 'dropoff-analysis', label: 'Drop-off Analysis', href: '/analytics/dropoff', icon: AlertTriangle, roles: ['manager'], section: 'analytics' },
]

const mortgageSpecialistWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['mortgage_specialist'], section: 'workspace' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: Users, roles: ['mortgage_specialist'], section: 'workspace' },
  { id: 'clients', label: 'Clients', href: '/clients', icon: UserCheck, roles: ['mortgage_specialist'], section: 'workspace' },
  { id: 'cases', label: 'Cases', href: '/cases', icon: Briefcase, roles: ['mortgage_specialist'], section: 'workspace' },
]

const mortgageSpecialistToolbox: NavItem[] = [
  { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, roles: ['mortgage_specialist'], section: 'toolbox' },
  { id: 'bank-products', label: 'Bank Products', href: '/bank-products', icon: Building2, roles: ['mortgage_specialist'], section: 'toolbox' },
  { id: 'templates-toolbox', label: 'Templates', href: '/templates', icon: FileText, roles: ['mortgage_specialist'], section: 'toolbox' },
]

const mortgageSpecialistPayouts: NavItem[] = [
  { id: 'my-commissions', label: 'My Commissions', href: '/payouts/commissions', icon: Coins, roles: ['mortgage_specialist'], section: 'payouts' },
]

const processExecutiveWorkspace: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['process_executive'], section: 'workspace' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: Users, roles: ['process_executive'], section: 'workspace' },
  { id: 'clients', label: 'Clients', href: '/clients', icon: UserCheck, roles: ['process_executive'], section: 'workspace' },
  { id: 'cases', label: 'Cases', href: '/cases', icon: Briefcase, roles: ['process_executive'], section: 'workspace' },
]

const processExecutiveToolbox: NavItem[] = [
  { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, roles: ['process_executive'], section: 'toolbox' },
  { id: 'bank-products', label: 'Bank Products', href: '/bank-products', icon: Building2, roles: ['process_executive'], section: 'toolbox' },
  { id: 'templates-toolbox', label: 'Templates', href: '/templates', icon: FileText, roles: ['process_executive'], section: 'toolbox' },
]

export function getNavigationSections(role: UserRole): NavSection[] {
  const sections: NavSection[] = []

  switch (role) {
    case 'admin':
      sections.push({
        id: 'settings',
        label: 'SETTINGS',
        items: adminItems,
      })
      break

    case 'manager':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: managerWorkspace,
      })
      sections.push({
        id: 'analytics',
        label: 'ANALYTICS',
        items: managerAnalytics,
      })
      break

    case 'mortgage_specialist':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: mortgageSpecialistWorkspace,
      })
      sections.push({
        id: 'toolbox',
        label: 'TOOLBOX',
        items: mortgageSpecialistToolbox,
      })
      sections.push({
        id: 'payouts',
        label: 'PAYOUTS',
        items: mortgageSpecialistPayouts,
      })
      break

    case 'process_executive':
      sections.push({
        id: 'workspace',
        label: 'WORKSPACE',
        items: processExecutiveWorkspace,
      })
      sections.push({
        id: 'toolbox',
        label: 'TOOLBOX',
        items: processExecutiveToolbox,
      })
      break
  }

  return sections
}

export function getSettingsItems(role: UserRole): NavItem[] {
  // Settings link only shows for admin at the bottom
  if (role === 'admin') {
    return []
  }
  return []
}
