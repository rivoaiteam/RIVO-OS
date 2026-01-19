/**
 * TypeScript types for Document entities.
 * These types correspond to the backend Django models and API responses.
 */

// Document Enums

export type DocumentLevel = 'client' | 'case'

export type ApplicantType = 'primary' | 'co_applicant' | 'both'

export type ApplicantRole = 'primary' | 'co_applicant'

export type DocumentStatus = 'pending' | 'uploaded' | 'verified'

export type UploadSource = 'web' | 'whatsapp'

// File validation constants
export const ACCEPTED_FORMATS = ['jpg', 'jpeg', 'png', 'heic', 'pdf'] as const
export const MAX_FILE_SIZE = 10_485_760 // 10 MB in bytes

export type AcceptedFormat = (typeof ACCEPTED_FORMATS)[number]

// Document Type

export interface DocumentType {
  id: string
  name: string
  level: DocumentLevel
  required: boolean
  description: string
  applicant_type: ApplicantType
  display_order: number
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface CreateDocumentTypeData {
  name: string
  level: DocumentLevel
  required?: boolean
  description?: string
  applicant_type?: ApplicantType
  display_order?: number
}

// Base Document

export interface BaseDocumentData {
  id: string
  document_type: string
  document_type_name: string
  document_type_required: boolean
  file_url: string
  file_name: string
  file_size: number | null
  file_format: string
  applicant_role: ApplicantRole
  status: DocumentStatus
  uploaded_via: UploadSource
  uploaded_at: string | null
  created_at: string
  updated_at: string
}

// Client Document

export interface ClientDocument extends BaseDocumentData {
  client: string
  client_name: string
}

export interface CreateClientDocumentData {
  document_type_id: string
  file_url: string
  file_name: string
  file_size?: number
  file_format?: string
  applicant_role?: ApplicantRole
  uploaded_via?: UploadSource
}

// Case Document

export interface CaseDocument extends BaseDocumentData {
  case: string
  case_id: string
}

export interface CreateCaseDocumentData {
  document_type_id: string
  file_url: string
  file_name: string
  file_size?: number
  file_format?: string
  applicant_role?: ApplicantRole
  uploaded_via?: UploadSource
}

// Checklist Types

export interface DocumentChecklistItem {
  document_type: DocumentType
  document: ClientDocument | CaseDocument | null
  is_uploaded: boolean
}

export interface DocumentChecklistResponse {
  primary: DocumentChecklistItem[]
  co_applicant: DocumentChecklistItem[] | null
  is_joint_application: boolean
}

// Display Labels

export const DOCUMENT_LEVEL_LABELS: Record<DocumentLevel, string> = {
  client: 'Client',
  case: 'Case',
}

export const APPLICANT_TYPE_LABELS: Record<ApplicantType, string> = {
  primary: 'Primary',
  co_applicant: 'Co-Applicant',
  both: 'Both',
}

export const APPLICANT_ROLE_LABELS: Record<ApplicantRole, string> = {
  primary: 'Primary',
  co_applicant: 'Co-Applicant',
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pending',
  uploaded: 'Uploaded',
  verified: 'Verified',
}

export const UPLOAD_SOURCE_LABELS: Record<UploadSource, string> = {
  web: 'Web',
  whatsapp: 'WhatsApp',
}

// File validation helpers

export function isAcceptedFormat(format: string): boolean {
  const normalizedFormat = format.toLowerCase().replace(/^\./, '')
  return ACCEPTED_FORMATS.includes(normalizedFormat as AcceptedFormat)
}

export function isFileSizeValid(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

export function getAcceptedFormatsString(): string {
  return ACCEPTED_FORMATS.map((f) => `.${f}`).join(', ')
}