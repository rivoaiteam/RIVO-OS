/**
 * Template variable substitution utilities.
 *
 * Used to fill Rivo message templates with actual client/lead data.
 */

import type { ClientData } from '@/types/mortgage'

/**
 * Format a number as currency (AED).
 */
function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return ''
  return new Intl.NumberFormat('en-AE', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * Format a date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Extract first name from full name.
 */
function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts[0] || ''
}

/**
 * Build a map of all available template variables from client/lead data.
 */
export function buildVariableMap(data: Partial<ClientData>): Record<string, string> {
  return {
    // Basic contact info (available for both leads and clients)
    first_name: getFirstName(data.name),
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',

    // Client financial info
    salary: formatCurrency(data.monthly_salary),
    max_loan: formatCurrency(data.max_loan_amount),
    dbr: data.dbr_percentage ? `${parseFloat(data.dbr_percentage).toFixed(1)}%` : '',

    // Client profile
    nationality: data.nationality || '',
    company: data.company_name || '',

    // Date
    today: formatDate(new Date()),
  }
}

/**
 * Fill template content with actual client/lead data.
 *
 * Replaces {variable_name} placeholders with actual values.
 * Unknown variables are left as-is.
 */
export function fillTemplateVariables(
  content: string,
  data?: Partial<ClientData> | { name?: string; phone?: string; email?: string }
): string {
  if (!data) return content
  const variables = buildVariableMap(data)

  return content.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined && value !== '' ? value : match
  })
}

/**
 * Preview template with sample data (for admin preview).
 */
export function previewTemplateWithSampleData(content: string): string {
  const sampleData: Partial<ClientData> = {
    name: 'Ahmed Khan',
    phone: '+971501234567',
    email: 'ahmed.khan@email.com',
    nationality: 'Pakistani',
    company_name: 'Emirates Group',
    monthly_salary: '25000',
    max_loan_amount: '1700000',
    dbr_percentage: '30',
  }

  return fillTemplateVariables(content, sampleData)
}

/**
 * List of available template variables for display in admin.
 */
export const TEMPLATE_VARIABLES = [
  { name: 'first_name', description: 'First name', example: 'Ahmed' },
  { name: 'name', description: 'Full name', example: 'Ahmed Khan' },
  { name: 'phone', description: 'Phone number', example: '+971501234567' },
  { name: 'email', description: 'Email address', example: 'ahmed@email.com' },
  { name: 'salary', description: 'Monthly salary', example: '25,000' },
  { name: 'max_loan', description: 'Max loan amount', example: '1,700,000' },
  { name: 'dbr', description: 'DBR available', example: '9,000' },
  { name: 'nationality', description: 'Nationality', example: 'Pakistani' },
  { name: 'company', description: 'Company name', example: 'Emirates Group' },
  { name: 'today', description: "Today's date", example: '22 Jan 2026' },
]
