/**
 * TypeScript types for SLA Breach Dashboard.
 * These types correspond to the backend API responses for SLA breach management.
 */

export type SLAType = 'all' | 'first_contact' | 'client_to_case' | 'stage'

export type SLATypeLabel = 'First Contact' | 'Client to Case' | 'Stage'

export interface SLABreachAssignedTo {
  id: string
  name: string
  email: string
}

export interface SLABreachItem {
  id: string
  // Type of entity: 'client' or 'case'
  entity_type: 'client' | 'case'
  // Entity ID
  entity_id: string
  // Entity display name (e.g., "Ahmed Khan - Client #1042")
  entity_name: string
  // SLA type that is breached
  sla_type: 'first_contact' | 'client_to_case' | 'stage'
  // SLA type display label
  sla_type_display: string
  // Assigned user
  assigned_to: SLABreachAssignedTo | null
  // Hours overdue (positive number)
  overdue_hours: number
  // Formatted overdue display (e.g., "6h", "2d")
  overdue_display: string
  // Last activity description
  last_activity: string | null
  // Last activity timestamp
  last_activity_at: string | null
  // Last activity formatted (e.g., "1d ago")
  last_activity_display: string | null
}

export interface SLABreachesQueryParams {
  sla_type?: SLAType
  owner?: string
  page?: number
  page_size?: number
  search?: string
}

export interface SLABreachesResponse {
  items: SLABreachItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// SLA Type display labels
export const SLA_TYPE_LABELS: Record<string, string> = {
  first_contact: 'First Contact',
  client_to_case: 'Client to Case',
  stage: 'Stage',
}

// SLA Type filter options
export const SLA_TYPE_OPTIONS: Array<{ value: SLAType; label: string }> = [
  { value: 'all', label: 'All SLA Types' },
  { value: 'first_contact', label: 'First Contact' },
  { value: 'client_to_case', label: 'Client to Case' },
  { value: 'stage', label: 'Stage' },
]
