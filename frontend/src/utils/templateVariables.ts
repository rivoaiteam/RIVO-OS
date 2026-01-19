/**
 * Template variable substitution utilities.
 *
 * Used to fill Rivo message templates with actual client data.
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
 * Extract last name from full name.
 */
function getLastName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts.slice(1).join(' ') || ''
}

/**
 * Build a map of all available template variables from client data.
 */
export function buildVariableMap(client: Partial<ClientData>): Record<string, string> {
  return {
    first_name: getFirstName(client.name),
    last_name: getLastName(client.name),
    full_name: client.name || '',
    phone: client.phone || '',
    email: client.email || '',
    nationality: client.nationality || '',
    company_name: client.company_name || '',
    monthly_salary: formatCurrency(client.monthly_salary),
    max_loan: formatCurrency(client.max_loan_amount),
    dbr_available: formatCurrency(client.dbr_available),
    today_date: formatDate(new Date()),
    residency: client.residency || '',
    employment_type: client.employment_type || '',
  }
}

/**
 * Fill template content with actual client data.
 *
 * Replaces {variable_name} placeholders with actual values.
 * Unknown variables are left as-is (e.g., {unknown} stays as {unknown}).
 *
 * @param content - Template content with {variable} placeholders
 * @param client - Client data to fill in
 * @returns Content with variables replaced
 */
export function fillTemplateVariables(
  content: string,
  client: Partial<ClientData>
): string {
  const variables = buildVariableMap(client)

  return content.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key]
    // Return the value if it exists and is not empty, otherwise keep the placeholder
    return value !== undefined && value !== '' ? value : match
  })
}

/**
 * Preview template with sample data (for admin preview).
 */
export function previewTemplateWithSampleData(content: string): string {
  const sampleClient: Partial<ClientData> = {
    name: 'John Smith',
    phone: '+971501234567',
    email: 'john.smith@example.com',
    nationality: 'British',
    company_name: 'ABC Corp',
    monthly_salary: '25000',
    max_loan_amount: '1700000',
    dbr_available: '9000',
    residency: 'UAE Resident',
    employment_type: 'Salaried',
  }

  return fillTemplateVariables(content, sampleClient)
}

/**
 * List of available template variables for display to users.
 */
export const TEMPLATE_VARIABLES = [
  { name: 'first_name', description: "Client's first name", example: 'John' },
  { name: 'last_name', description: "Client's last name", example: 'Smith' },
  { name: 'full_name', description: "Client's full name", example: 'John Smith' },
  { name: 'phone', description: "Client's phone number", example: '+971501234567' },
  { name: 'email', description: "Client's email address", example: 'john@example.com' },
  { name: 'nationality', description: "Client's nationality", example: 'British' },
  { name: 'company_name', description: "Client's employer", example: 'ABC Corp' },
  { name: 'monthly_salary', description: 'Monthly salary (formatted)', example: '25,000' },
  { name: 'max_loan', description: 'Maximum loan amount (formatted)', example: '1,700,000' },
  { name: 'dbr_available', description: 'DBR available (formatted)', example: '9,000' },
  { name: 'today_date', description: "Today's date", example: '19 Jan 2026' },
  { name: 'residency', description: 'Residency status', example: 'UAE Resident' },
  { name: 'employment_type', description: 'Employment type', example: 'Salaried' },
]
