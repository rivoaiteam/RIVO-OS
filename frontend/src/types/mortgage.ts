/**
 * TypeScript types for Mortgage entities: Leads, Clients, and Cases.
 * These types correspond to the backend Django models and API responses.
 */

// Status Enums

export type LeadStatus = 'active' | 'declined'

export type ClientStatus = 'active' | 'converted' | 'declined' | 'not_proceeding'

export type CaseStage =
  // Active stages
  | 'processing'
  | 'document_collection'
  | 'bank_submission'
  | 'bank_processing'
  | 'offer_issued'
  | 'offer_accepted'
  | 'property_valuation'
  | 'final_approval'
  | 'property_transfer'
  | 'property_transferred'
  // Hold
  | 'on_hold'
  // Terminal (also includes property_transferred, declined, not_proceeding)
  | 'declined'
  | 'not_proceeding'

// Reference Types

export type ResidencyType = 'uae_national' | 'uae_resident' | 'non_resident'

export type VisaType = 'employment' | 'investor' | 'golden' | 'retirement' | 'other'

export type ApplicationType = 'single' | 'joint'

export type EmploymentType = 'salaried' | 'self_employed'

export type PropertyType = 'ready' | 'off_plan'

export type TransactionType = 'primary_purchase' | 'resale' | 'buyout_equity' | 'buyout' | 'equity'

export type Timeline = 'immediate' | '1_3_months' | '3_6_months' | 'exploring'

export type RateType = 'fixed' | 'variable'

export type PropertyCategory = 'residential' | 'commercial'

export type CaseTypeValue = 'fully_packaged' | 'assisted'

export type MortgageType = 'conventional' | 'islamic'

export type Emirate = 'dubai' | 'abu_dhabi' | 'sharjah' | 'ajman' | 'ras_al_khaimah' | 'fujairah' | 'umm_al_quwain'

export type FixedPeriod = '1' | '2' | '3' | '4' | '5'

// SLA Status Types

export type SLAStatusValue = 'ok' | 'warning' | 'overdue' | 'completed' | 'not_started' | 'no_sla'

export interface SLAStatusData {
  status: SLAStatusValue
  remaining_hours: number | null
  display: string | null
  stage_name?: string | null
}

// Nested Types for API responses

export interface SubSourceSummary {
  id: string
  name: string
  source_name: string
  channel_name: string
  is_trusted: boolean
  effective_sla: number | null
}

export interface ClientSummary {
  id: string
  name: string
  phone: string
  email: string | null
}

// Lead Types

export interface LeadListItem {
  id: string
  name: string
  phone: string
  email: string | null
  status: LeadStatus
  sub_source: SubSourceSummary
  sla_display: string | null
  created_at: string
  updated_at: string
}

export interface LeadData {
  id: string
  name: string
  phone: string
  email: string | null
  sub_source: SubSourceSummary
  intent: string | null
  status: LeadStatus
  converted_client: string | null
  sla_timer: {
    effective_sla_minutes: number | null
    elapsed_minutes: number
    remaining_minutes: number | null
    is_overdue: boolean
    display: string | null
  }
  created_at: string
  updated_at: string
}

export interface CreateLeadData {
  name: string
  phone: string
  email?: string
  sub_source_id: string
  intent?: string
}

export interface UpdateLeadData {
  name?: string
  phone?: string
  email?: string
  intent?: string
}

// Client Types

export interface CoApplicantData {
  id: string
  name: string
  phone: string
  email: string | null
  emirates_id: string | null
  residency: ResidencyType | null
  visa_type: VisaType | null
  employment_type: EmploymentType | null
  monthly_salary: string | null
  company_name: string | null
  cc_1_limit: string | null
  cc_2_limit: string | null
  cc_3_limit: string | null
  cc_4_limit: string | null
  cc_5_limit: string | null
  auto_loan_emi: string | null
  personal_loan_emi: string | null
  existing_mortgage_emi: string | null
  total_cc_liability: string
  total_loan_emis: string
  total_monthly_liabilities: string
}

export interface ClientCaseSummary {
  id: string
  stage: CaseStage
  bank: string
  loan_amount: string
}

export interface ClientListItem {
  id: string
  name: string
  phone: string
  email: string | null
  status: ClientStatus
  application_type: ApplicationType | null
  dbr_available: string | null
  sub_source: SubSourceSummary
  sla_display: string | null
  active_case_id: ClientCaseSummary[] | null
  created_at: string
  // SLA status fields
  first_contact_sla_status?: SLAStatusData | null
  client_to_case_sla_status?: SLAStatusData | null
}

export interface ClientData {
  id: string
  // Identity
  name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  nationality: string | null
  emirates_id: string | null
  residency: ResidencyType | null
  visa_type: VisaType | null
  // Application Type
  application_type: ApplicationType | null
  // Income
  employment_type: EmploymentType | null
  monthly_salary: string | null
  total_addbacks: string | null
  company_name: string | null
  // Liabilities
  cc_1_limit: string | null
  cc_2_limit: string | null
  cc_3_limit: string | null
  cc_4_limit: string | null
  cc_5_limit: string | null
  auto_loan_emi: string | null
  personal_loan_emi: string | null
  existing_mortgage_emi: string | null
  // Intent
  notes: string | null
  timeline: Timeline | null
  // Status & Source
  status: ClientStatus
  sub_source: SubSourceSummary
  converted_from_lead: string | null
  // Co-Applicant (for joint applications)
  co_applicant: CoApplicantData | null
  // Calculated Fields
  total_cc_liability: string
  total_loan_emis: string
  total_monthly_liabilities: string
  dbr_available: string
  max_loan_amount: string
  can_create_case: boolean
  // SLA Status Fields
  first_contact_sla_status?: SLAStatusData | null
  client_to_case_sla_status?: SLAStatusData | null
  first_contact_completed_at?: string | null
  // Owner
  assigned_to?: {
    id: string
    name: string
    email: string
  } | null
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateClientData {
  // Identity
  name: string
  phone: string
  email?: string
  date_of_birth?: string
  nationality?: string
  emirates_id?: string
  residency?: ResidencyType
  visa_type?: VisaType
  // Application Type
  application_type?: ApplicationType
  // Income
  employment_type?: EmploymentType
  monthly_salary?: string
  total_addbacks?: string
  company_name?: string
  // Liabilities
  cc_1_limit?: string
  cc_2_limit?: string
  cc_3_limit?: string
  cc_4_limit?: string
  cc_5_limit?: string
  auto_loan_emi?: string
  personal_loan_emi?: string
  existing_mortgage_emi?: string
  // Intent
  notes?: string
  timeline?: Timeline
  // Source
  sub_source_id: string
  // Or converted from lead
  converted_from_lead_id?: string
}

export interface UpdateClientData {
  // Identity
  name?: string
  phone?: string
  email?: string
  date_of_birth?: string
  nationality?: string
  emirates_id?: string
  residency?: ResidencyType
  visa_type?: VisaType
  // Application Type
  application_type?: ApplicationType
  // Income
  employment_type?: EmploymentType
  monthly_salary?: string
  total_addbacks?: string
  company_name?: string
  // Liabilities
  cc_1_limit?: string
  cc_2_limit?: string
  cc_3_limit?: string
  cc_4_limit?: string
  cc_5_limit?: string
  auto_loan_emi?: string
  personal_loan_emi?: string
  existing_mortgage_emi?: string
  // Intent
  notes?: string
  timeline?: Timeline
}

export interface UpdateCoApplicantData {
  name: string
  phone: string
  email?: string
  emirates_id?: string
  residency?: ResidencyType
  visa_type?: VisaType
  employment_type?: EmploymentType
  monthly_salary?: string
  company_name?: string
  cc_1_limit?: string
  cc_2_limit?: string
  cc_3_limit?: string
  cc_4_limit?: string
  cc_5_limit?: string
  auto_loan_emi?: string
  personal_loan_emi?: string
  existing_mortgage_emi?: string
}

// Case Types

export interface CaseListItem {
  id: string
  client: ClientSummary
  stage: CaseStage
  property_value: string
  loan_amount: string
  bank: string | null
  created_at: string
  // SLA status fields
  stage_sla_status?: SLAStatusData | null
}

export interface CaseData {
  id: string
  // Client
  client: ClientSummary
  application_type: ApplicationType
  // Case Type
  case_type: CaseTypeValue
  // Property
  property_category: PropertyCategory
  property_type: PropertyType
  emirate: Emirate
  transaction_type: TransactionType
  property_value: string
  developer: string | null
  project_name: string | null
  location: string | null
  is_first_property: boolean
  // Loan
  loan_amount: string
  tenure_years: number
  tenure_months: number
  // Bank Product
  bank: string | null
  mortgage_type: MortgageType
  rate_type: RateType | null
  rate: string | null
  fixed_period: FixedPeriod | null
  // Stage
  stage: CaseStage
  stage_changed_at: string | null
  // Calculated
  ltv_percentage: string
  ltv_limit: string
  // SLA Status Fields
  stage_sla_status?: SLAStatusData | null
  // Owner
  assigned_to?: {
    id: string
    name: string
    email: string
  } | null
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CreateCaseData {
  client_id: string
  // Case Type
  case_type?: CaseTypeValue
  // Property
  property_category?: PropertyCategory
  property_type: PropertyType
  emirate?: Emirate
  transaction_type: TransactionType
  property_value: string
  developer?: string
  project_name?: string
  location?: string
  is_first_property?: boolean
  // Loan
  loan_amount: string
  tenure_years: number
  tenure_months?: number
  // Bank Product
  bank?: string
  mortgage_type?: MortgageType
  rate_type?: RateType
  rate?: string
  fixed_period?: FixedPeriod
}

export interface UpdateCaseData {
  // Case Type
  case_type?: CaseTypeValue
  // Property
  property_category?: PropertyCategory
  property_type?: PropertyType
  emirate?: Emirate
  transaction_type?: TransactionType
  property_value?: string
  developer?: string
  project_name?: string
  location?: string
  is_first_property?: boolean
  // Loan
  loan_amount?: string
  tenure_years?: number
  tenure_months?: number
  // Bank Product
  bank?: string
  mortgage_type?: MortgageType
  rate_type?: RateType
  rate?: string
  fixed_period?: FixedPeriod
}

// Paginated Response Type (reusable)

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// Query Params Types

export interface LeadsQueryParams {
  page?: number
  page_size?: number
  search?: string
  status?: LeadStatus | 'all'
}

export interface ClientsQueryParams {
  page?: number
  page_size?: number
  search?: string
  status?: ClientStatus | 'all'
  application_type?: ApplicationType | 'all'
}

export interface CasesQueryParams {
  page?: number
  page_size?: number
  search?: string
  stage?: CaseStage | 'all'
  bank?: string
}

// Stage Category Helpers

export const ACTIVE_STAGES: CaseStage[] = [
  'processing',
  'document_collection',
  'bank_submission',
  'bank_processing',
  'offer_issued',
  'offer_accepted',
  'property_valuation',
  'final_approval',
  'property_transfer',
]

export const HOLD_STAGES: CaseStage[] = ['on_hold']

export const TERMINAL_STAGES: CaseStage[] = [
  'property_transferred',
  'declined',
  'not_proceeding',
]

// Display Labels

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  active: 'Active',
  declined: 'Declined',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  converted: 'Converted',
  declined: 'Declined',
  not_proceeding: 'Not Proceeding',
}

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
  processing: 'Processing',
  document_collection: 'Document Collection',
  bank_submission: 'Bank Submission',
  bank_processing: 'Bank Processing',
  offer_issued: 'Offer Issued',
  offer_accepted: 'Offer Accepted',
  property_valuation: 'Property Valuation',
  final_approval: 'Final Approval',
  property_transfer: 'Property Transfer',
  property_transferred: 'Property Transferred',
  on_hold: 'On Hold',
  declined: 'Declined',
  not_proceeding: 'Not Proceeding',
}

export const RESIDENCY_LABELS: Record<ResidencyType, string> = {
  uae_national: 'UAE National',
  uae_resident: 'UAE Resident',
  non_resident: 'Non-Resident',
}

export const VISA_TYPE_LABELS: Record<VisaType, string> = {
  employment: 'Employment',
  investor: 'Investor',
  golden: 'Golden',
  retirement: 'Retirement',
  other: 'Other',
}

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  single: 'Individual',
  joint: 'Co-borrower',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  salaried: 'Salaried',
  self_employed: 'Self Employed',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  ready: 'Ready',
  off_plan: 'Off-Plan',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  primary_purchase: 'Primary Purchase',
  resale: 'Resale',
  buyout_equity: 'Buyout + Equity',
  buyout: 'Buyout',
  equity: 'Equity',
}

export const TIMELINE_LABELS: Record<Timeline, string> = {
  immediate: 'Immediate',
  '1_3_months': '1-3 Months',
  '3_6_months': '3-6 Months',
  exploring: 'Exploring',
}

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  fixed: 'Fixed',
  variable: 'Variable',
}

export const PROPERTY_CATEGORY_LABELS: Record<PropertyCategory, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
}

export const CASE_TYPE_LABELS: Record<CaseTypeValue, string> = {
  fully_packaged: 'Fully Packaged',
  assisted: 'Assisted',
}

export const MORTGAGE_TYPE_LABELS: Record<MortgageType, string> = {
  conventional: 'Conventional',
  islamic: 'Islamic',
}

export const EMIRATE_LABELS: Record<Emirate, string> = {
  dubai: 'Dubai',
  abu_dhabi: 'Abu Dhabi',
  sharjah: 'Sharjah',
  ajman: 'Ajman',
  ras_al_khaimah: 'Ras Al Khaimah',
  fujairah: 'Fujairah',
  umm_al_quwain: 'Umm Al Quwain',
}

export const FIXED_PERIOD_LABELS: Record<FixedPeriod, string> = {
  '1': '1 Year',
  '2': '2 Years',
  '3': '3 Years',
  '4': '4 Years',
  '5': '5 Years',
}

// SLA Status Labels
export const SLA_STATUS_LABELS: Record<SLAStatusValue, string> = {
  ok: 'On Track',
  warning: 'At Risk',
  overdue: 'Overdue',
  completed: 'Completed',
  not_started: 'Not Started',
  no_sla: 'No SLA',
}
