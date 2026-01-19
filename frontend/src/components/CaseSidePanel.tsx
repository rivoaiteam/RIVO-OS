/**
 * CaseSidePanel - Unified panel for creating and editing cases.
 * Same UI pattern as ClientSidePanel for consistency.
 * Includes tabs for Details and Documents in edit mode.
 */

import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCase,
  useCreateCase,
  useUpdateCase,
  useChangeCaseStage,
  useBanks,
  CASE_STAGES,
  getStageLabel,
  isTerminalStage,
  calculateLTV,
} from '@/hooks/useCases'
import { useClients, useClient } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import { ClientSidePanel } from '@/components/ClientSidePanel'
import { CaseDocumentTab } from '@/components/documents'
import { ActivityTimeline } from '@/components/activity'
import { SLACountdown } from '@/components/SLACountdown'
import type {
  CaseData,
  CaseStage,
  PropertyCategory,
  CaseTypeValue,
  Emirate,
  MortgageType,
  FixedPeriod,
  SLAStatusValue,
} from '@/types/mortgage'
import {
  APPLICATION_TYPE_LABELS,
  EMIRATE_LABELS,
  MORTGAGE_TYPE_LABELS,
  FIXED_PERIOD_LABELS,
  CASE_STAGE_LABELS,
} from '@/types/mortgage'

interface CaseSidePanelProps {
  caseId: string | null
  isOpen: boolean
  onClose: () => void
  preselectedClientId?: string | null
}

type CaseTabType = 'details' | 'documents' | 'activity'

const stageColors: Record<CaseStage, string> = {
  processing: 'bg-blue-100 text-blue-700',
  document_collection: 'bg-blue-100 text-blue-700',
  bank_submission: 'bg-blue-100 text-blue-800',
  bank_processing: 'bg-blue-200 text-blue-800',
  offer_issued: 'bg-indigo-100 text-indigo-700',
  offer_accepted: 'bg-indigo-200 text-indigo-800',
  property_valuation: 'bg-violet-100 text-violet-700',
  final_approval: 'bg-violet-200 text-violet-800',
  property_transfer: 'bg-purple-100 text-purple-700',
  on_hold: 'bg-amber-100 text-amber-700',
  property_transferred: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  not_proceeding: 'bg-gray-200 text-gray-500',
}

export function CaseSidePanel({ caseId, isOpen, onClose, preselectedClientId }: CaseSidePanelProps) {
  const isCreateMode = caseId === 'new'
  const { data: caseData, isLoading, error } = useCase(caseId)

  if (!isOpen) {
    return null
  }

  return (
    <SidePanelWrapper onClose={onClose}>
      {isCreateMode ? (
        <CreateCaseContent onClose={onClose} preselectedClientId={preselectedClientId} />
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <p className="text-gray-600">Failed to load case</p>
        </div>
      ) : caseData ? (
        <EditCaseContent caseData={caseData} onClose={onClose} />
      ) : null}
    </SidePanelWrapper>
  )
}

function SidePanelWrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-1/2 min-w-[480px] max-w-[800px] bg-white z-50 shadow-xl flex flex-col animate-slide-in-right">
        {children}
      </div>
    </>
  )
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

interface BankDropdownProps {
  value: string
  onChange: (value: string) => void
  banks: Array<{ id: string; name: string; icon: string }> | undefined
  disabled?: boolean
}

function BankDropdown({ value, onChange, banks, disabled }: BankDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedBank = banks?.find(b => b.name === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-left flex items-center justify-between',
          'focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {selectedBank ? (
          <span className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={selectedBank.icon}
                alt=""
                className="h-4 w-4 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
            <span className="text-gray-900">{selectedBank.name}</span>
          </span>
        ) : (
          <span className="text-gray-400">Select a bank</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && banks && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {banks.map(bank => (
            <button
              key={bank.id}
              type="button"
              onClick={() => { onChange(bank.name); setIsOpen(false) }}
              className={cn(
                'w-full px-3 py-2.5 text-sm text-left flex items-center gap-3 hover:bg-gray-50 transition-colors',
                value === bank.name && 'bg-blue-50'
              )}
            >
              <div className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src={bank.icon}
                  alt=""
                  className="h-5 w-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
              <span className="text-gray-900">{bank.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface CreateCaseContentProps {
  onClose: () => void
  preselectedClientId?: string | null
}

function CreateCaseContent({ onClose, preselectedClientId }: CreateCaseContentProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(preselectedClientId || null)

  // Case type fields
  const [propertyCategory, setPropertyCategory] = useState<PropertyCategory>('residential')
  const [caseType, setCaseType] = useState<CaseTypeValue>('fully_packaged')

  // Property fields
  const [propertyType, setPropertyType] = useState<'ready' | 'off_plan'>('ready')
  const [emirate, setEmirate] = useState<Emirate>('dubai')
  const [transactionType, setTransactionType] = useState<'primary_purchase' | 'resale' | 'buyout_equity' | 'buyout' | 'equity'>('primary_purchase')
  const [propertyValue, setPropertyValue] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [developer, setDeveloper] = useState('')
  const [isFirstProperty, setIsFirstProperty] = useState(true)

  // Loan fields
  const [tenureYears, setTenureYears] = useState(20)
  const [tenureMonths, setTenureMonths] = useState(0)

  // Bank fields
  const [bank, setBank] = useState('')
  const [mortgageType, setMortgageType] = useState<MortgageType>('conventional')
  const [rateType, setRateType] = useState<'fixed' | 'variable'>('fixed')
  const [rate, setRate] = useState('')
  const [fixedPeriod, setFixedPeriod] = useState<FixedPeriod | ''>('')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [formInitialized, setFormInitialized] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const { data: clientsData } = useClients({ page_size: 100, status: 'active' })
  const { data: preselectedClientData } = useClient(preselectedClientId || null)
  const { data: banks } = useBanks()
  const createCaseMutation = useCreateCase()

  // Filter to only eligible clients (positive DBR and active status)
  const eligibleClients = (clientsData?.items || []).filter(c =>
    c.status === 'active' &&
    c.dbr_available &&
    parseFloat(c.dbr_available) > 0
  )

  // Mark form as initialized when preselected client data arrives (no pre-fill - property fields are in Case only)
  useEffect(() => {
    if (preselectedClientData && !formInitialized) {
      setFormInitialized(true)
    }
  }, [preselectedClientData, formInitialized])

  // Calculate LTV
  const ltv = calculateLTV(loanAmount, propertyValue)

  // Sanitize amount input
  const sanitizeAmount = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
    return cleaned
  }

  const handleCreate = async () => {
    setSaveError(null)

    const errors: string[] = []

    // Client validation
    if (!selectedClientId) {
      errors.push('Client is required')
    }

    // Property validation
    if (!propertyValue) {
      errors.push('Property value is required')
    } else {
      const propVal = parseFloat(propertyValue)
      if (isNaN(propVal) || propVal <= 0) {
        errors.push('Invalid property value (must be a positive number)')
      }
    }

    // Loan validation
    if (!loanAmount) {
      errors.push('Loan amount is required')
    } else {
      const loanVal = parseFloat(loanAmount)
      const propVal = parseFloat(propertyValue) || 0
      if (isNaN(loanVal) || loanVal <= 0) {
        errors.push('Invalid loan amount (must be a positive number)')
      } else if (propVal > 0 && loanVal > propVal) {
        errors.push(`Loan amount cannot exceed property value (AED ${propVal.toLocaleString()})`)
      }
    }

    // LTV validation
    if (loanAmount && propertyValue) {
      const loanVal = parseFloat(loanAmount)
      const propVal = parseFloat(propertyValue)
      if (propVal > 0 && loanVal > 0) {
        const ltvValue = (loanVal / propVal) * 100
        const ltvLimit = propertyType === 'off_plan' ? 50 : (isFirstProperty ? 80 : 65)
        if (ltvValue > ltvLimit) {
          errors.push(`LTV ${ltvValue.toFixed(1)}% exceeds ${ltvLimit}% limit for ${propertyType === 'off_plan' ? 'under construction' : isFirstProperty ? 'first property' : 'second+ property'}`)
        }
      }
    }

    // Tenure validation
    if (tenureYears < 1 || tenureYears > 25) {
      errors.push('Invalid tenure (1-25 years)')
    }
    if (tenureMonths < 0 || tenureMonths > 11) {
      errors.push('Invalid months (0-11)')
    }

    // Bank validation
    if (!bank.trim()) {
      errors.push('Please select a bank')
    }

    // Rate validation
    if (!rate) {
      errors.push('Interest rate is required')
    } else {
      const rateNum = parseFloat(rate)
      if (isNaN(rateNum) || rateNum <= 0) {
        errors.push('Invalid rate (must be a positive number)')
      } else if (rateNum < 0.1) {
        errors.push('Rate must be at least 0.1%')
      } else if (rateNum > 20) {
        errors.push('Rate cannot exceed 20%')
      }
    }

    // Fixed period validation (only if rate type is fixed)
    if (rateType === 'fixed' && !fixedPeriod) {
      errors.push('Fixed period is required for fixed rate')
    }

    if (errors.length > 0) {
      setSaveError(errors[0])
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    try {
      await createCaseMutation.mutateAsync({
        client_id: selectedClientId!,
        case_type: caseType,
        property_category: propertyCategory,
        property_type: propertyType,
        emirate: emirate,
        transaction_type: transactionType,
        property_value: propertyValue,
        loan_amount: loanAmount,
        developer: developer || undefined,
        is_first_property: isFirstProperty,
        tenure_years: tenureYears,
        tenure_months: tenureMonths,
        bank: bank.trim(),
        mortgage_type: mortgageType,
        rate_type: rateType,
        rate: rate,
        fixed_period: fixedPeriod || undefined,
      })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create case')
    }
  }

  const isPending = createCaseMutation.isPending

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Case</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        {saveError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {saveError}
          </div>
        )}
      </div>

      {/* Form Content */}
      <div ref={formRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Deal Information */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Information</h3>
          <FormField label="Select Client *">
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value || null)}
              disabled={!!preselectedClientId}
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white disabled:opacity-50"
            >
              <option value="">Select an eligible client</option>
              {eligibleClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} - {client.phone}
                </option>
              ))}
            </select>
          </FormField>
          {eligibleClients.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">No eligible clients found. Clients must have positive DBR.</p>
            </div>
          )}

          {/* Property Category Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPropertyCategory('residential')}
              className={cn(
                'flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1',
                propertyCategory === 'residential'
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="text-sm font-medium text-gray-900">Residential</span>
            </button>
            <button
              type="button"
              onClick={() => setPropertyCategory('commercial')}
              className={cn(
                'flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1',
                propertyCategory === 'commercial'
                  ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="text-sm font-medium text-gray-900">Commercial</span>
            </button>
          </div>

          {/* Case Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCaseType('fully_packaged')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                caseType === 'fully_packaged'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Fully Packaged
            </button>
            <button
              type="button"
              onClick={() => setCaseType('assisted')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                caseType === 'assisted'
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Assisted
            </button>
          </div>
        </div>

        {/* Property Details */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Property</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Emirate *">
              <select
                value={emirate}
                onChange={(e) => setEmirate(e.target.value as Emirate)}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
              >
                {Object.entries(EMIRATE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Transaction Type *">
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as 'primary_purchase' | 'resale' | 'buyout_equity' | 'buyout' | 'equity')}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
              >
                <option value="primary_purchase">Primary Purchase</option>
                <option value="resale">Resale</option>
                <option value="buyout_equity">Buyout + Equity</option>
                <option value="buyout">Buyout</option>
                <option value="equity">Equity</option>
              </select>
            </FormField>
            <FormField label="Property Status *">
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as 'ready' | 'off_plan')}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
              >
                <option value="ready">Ready</option>
                <option value="off_plan">Under Construction</option>
              </select>
            </FormField>
            <FormField label="Property Value (AED) *">
              <input
                type="text"
                inputMode="numeric"
                value={propertyValue}
                onChange={(e) => setPropertyValue(sanitizeAmount(e.target.value))}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </FormField>
          </div>

          {/* First Property Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFirstProperty(true)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                isFirstProperty
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              First Property
            </button>
            <button
              type="button"
              onClick={() => setIsFirstProperty(false)}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                !isFirstProperty
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Second+ Property
            </button>
          </div>

          {propertyType === 'off_plan' && (
            <FormField label="Developer">
              <input
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="e.g., Emaar, DAMAC"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </FormField>
          )}
        </div>

        {/* Loan Details */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loan</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Loan Amount (AED) *">
              <input
                type="text"
                inputMode="numeric"
                value={loanAmount}
                onChange={(e) => setLoanAmount(sanitizeAmount(e.target.value))}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </FormField>
            <FormField label="Mortgage Term *">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={tenureYears}
                  onChange={(e) => setTenureYears(parseInt(e.target.value) || 1)}
                  className="w-16 h-9 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] text-center"
                />
                <span className="text-xs text-gray-500">yrs</span>
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(parseInt(e.target.value) || 0)}
                  className="w-16 h-9 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] text-center"
                />
                <span className="text-xs text-gray-500">mo</span>
              </div>
            </FormField>
          </div>
        </div>

        {/* Bank Product */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank Product</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bank *">
              <BankDropdown value={bank} onChange={setBank} banks={banks} />
            </FormField>
            <FormField label="Mortgage Type *">
              <select
                value={mortgageType}
                onChange={(e) => setMortgageType(e.target.value as MortgageType)}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
              >
                {Object.entries(MORTGAGE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Rate Type *">
              <select
                value={rateType}
                onChange={(e) => setRateType(e.target.value as 'fixed' | 'variable')}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
              >
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
              </select>
            </FormField>
            <FormField label="Rate (%) *">
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(sanitizeAmount(e.target.value))}
                placeholder="e.g., 4.99"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </FormField>
            {rateType === 'fixed' && (
              <FormField label="Fixed Period">
                <select
                  value={fixedPeriod}
                  onChange={(e) => setFixedPeriod(e.target.value as FixedPeriod | '')}
                  className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white"
                >
                  <option value="">Select period...</option>
                  {Object.entries(FIXED_PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>
            )}
          </div>
        </div>

        {/* LTV Summary */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Eligibility</h3>
          <div className="grid grid-cols-1">
            {(() => {
              const ltvNum = parseFloat(ltv)
              const ltvLimit = propertyType === 'off_plan' ? 50 : (isFirstProperty ? 80 : 65)
              const isWithinLimit = ltvNum > 0 && ltvNum <= ltvLimit
              return (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-medium text-gray-400 uppercase block mb-1">LTV (Loan to Value)</span>
                  <span className={cn(
                    'text-lg font-bold',
                    ltvNum > 0 ? (isWithinLimit ? 'text-green-600' : 'text-red-600') : 'text-gray-400'
                  )}>
                    {ltvNum > 0 ? `${ltvNum.toFixed(1)}%` : '-'}
                  </span>
                  <span className="text-xs text-gray-500 block mt-0.5">
                    {ltvNum > 0 ? (isWithinLimit ? `Within ${ltvLimit}% limit` : `Exceeds ${ltvLimit}% limit`) : `Limit: ${ltvLimit}%`}
                  </span>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
          ) : (
            'Create Case'
          )}
        </button>
      </div>
    </>
  )
}

function EditCaseContent({ caseData, onClose }: { caseData: CaseData; onClose: () => void }) {
  const { user } = useAuth()

  // Permission check - managers have read-only access per IAM specs
  const isReadOnly = user?.role === 'manager'
  const canEdit = !isReadOnly && (user?.role === 'admin' || user?.role === 'mortgage_specialist' || user?.role === 'process_executive')

  // Tab state
  const [activeTab, setActiveTab] = useState<CaseTabType>('details')

  // Client side panel state
  const [showClientPanel, setShowClientPanel] = useState(false)

  // Case type fields
  const [propertyCategory, setPropertyCategory] = useState<PropertyCategory>(caseData.property_category || 'residential')
  const [caseType, setCaseType] = useState<CaseTypeValue>(caseData.case_type || 'fully_packaged')

  // Property fields
  const [propertyType, setPropertyType] = useState(caseData.property_type)
  const [emirate, setEmirate] = useState<Emirate>(caseData.emirate || 'dubai')
  const [transactionType, setTransactionType] = useState(caseData.transaction_type)
  const [propertyValue, setPropertyValue] = useState(caseData.property_value)
  const [loanAmount, setLoanAmount] = useState(caseData.loan_amount)
  const [developer, setDeveloper] = useState(caseData.developer || '')
  const [isFirstProperty, setIsFirstProperty] = useState(caseData.is_first_property ?? true)

  // Loan fields
  const [tenureYears, setTenureYears] = useState(caseData.tenure_years)
  const [tenureMonths, setTenureMonths] = useState(caseData.tenure_months || 0)

  // Bank fields
  const [bank, setBank] = useState(caseData.bank || '')
  const [mortgageType, setMortgageType] = useState<MortgageType>(caseData.mortgage_type || 'conventional')
  const [rateType, setRateType] = useState(caseData.rate_type || 'fixed')
  const [rate, setRate] = useState(caseData.rate || '')
  const [fixedPeriod, setFixedPeriod] = useState<FixedPeriod | ''>(caseData.fixed_period || '')

  const [saveError, setSaveError] = useState<string | null>(null)
  const [_hasChanges, _setHasChanges] = useState(false)

  const { data: banks } = useBanks()
  const updateMutation = useUpdateCase()
  const changeStageMutation = useChangeCaseStage()

  const isTerminal = isTerminalStage(caseData.stage)
  const ltv = calculateLTV(loanAmount, propertyValue)

  // Get Stage SLA status
  const stageSLA = caseData.stage_sla_status

  // Sanitize amount input
  const sanitizeAmount = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('')
    return cleaned
  }

  // Track changes
  useEffect(() => {
    const changed =
      propertyCategory !== (caseData.property_category || 'residential') ||
      caseType !== (caseData.case_type || 'fully_packaged') ||
      propertyType !== caseData.property_type ||
      emirate !== (caseData.emirate || 'dubai') ||
      transactionType !== caseData.transaction_type ||
      propertyValue !== caseData.property_value ||
      loanAmount !== caseData.loan_amount ||
      developer !== (caseData.developer || '') ||
      isFirstProperty !== (caseData.is_first_property ?? true) ||
      tenureYears !== caseData.tenure_years ||
      tenureMonths !== (caseData.tenure_months || 0) ||
      bank !== (caseData.bank || '') ||
      mortgageType !== (caseData.mortgage_type || 'conventional') ||
      rateType !== (caseData.rate_type || 'fixed') ||
      rate !== (caseData.rate || '') ||
      fixedPeriod !== (caseData.fixed_period || '')
    _setHasChanges(changed)
  }, [propertyCategory, caseType, propertyType, emirate, transactionType, propertyValue, loanAmount, developer, isFirstProperty, tenureYears, tenureMonths, bank, mortgageType, rateType, rate, fixedPeriod, caseData])

  const handleSave = async () => {
    setSaveError(null)

    const errors: string[] = []

    // Property validation
    if (!propertyValue) {
      errors.push('Property value is required')
    } else {
      const propVal = parseFloat(propertyValue)
      if (isNaN(propVal) || propVal <= 0) {
        errors.push('Invalid property value (must be a positive number)')
      }
    }

    // Loan validation
    if (!loanAmount) {
      errors.push('Loan amount is required')
    } else {
      const loanVal = parseFloat(loanAmount)
      const propVal = parseFloat(propertyValue) || 0
      if (isNaN(loanVal) || loanVal <= 0) {
        errors.push('Invalid loan amount (must be a positive number)')
      } else if (propVal > 0 && loanVal > propVal) {
        errors.push(`Loan amount cannot exceed property value (AED ${propVal.toLocaleString()})`)
      }
    }

    // LTV validation
    if (loanAmount && propertyValue) {
      const loanVal = parseFloat(loanAmount)
      const propVal = parseFloat(propertyValue)
      if (propVal > 0 && loanVal > 0) {
        const ltvValue = (loanVal / propVal) * 100
        const ltvLimit = propertyType === 'off_plan' ? 50 : (isFirstProperty ? 80 : 65)
        if (ltvValue > ltvLimit) {
          errors.push(`LTV ${ltvValue.toFixed(1)}% exceeds ${ltvLimit}% limit for ${propertyType === 'off_plan' ? 'under construction' : isFirstProperty ? 'first property' : 'second+ property'}`)
        }
      }
    }

    // Tenure validation
    if (tenureYears < 1 || tenureYears > 25) {
      errors.push('Invalid tenure (1-25 years)')
    }
    if (tenureMonths < 0 || tenureMonths > 11) {
      errors.push('Invalid months (0-11)')
    }

    // Bank validation
    if (!bank.trim()) {
      errors.push('Please select a bank')
    }

    // Rate validation
    if (!rate) {
      errors.push('Interest rate is required')
    } else {
      const rateNum = parseFloat(rate)
      if (isNaN(rateNum) || rateNum <= 0) {
        errors.push('Invalid rate (must be a positive number)')
      } else if (rateNum < 0.1) {
        errors.push('Rate must be at least 0.1%')
      } else if (rateNum > 20) {
        errors.push('Rate cannot exceed 20%')
      }
    }

    // Fixed period validation (only if rate type is fixed)
    if (rateType === 'fixed' && !fixedPeriod) {
      errors.push('Fixed period is required for fixed rate')
    }

    if (errors.length > 0) {
      setSaveError(errors[0])
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: caseData.id,
        data: {
          case_type: caseType,
          property_category: propertyCategory,
          property_type: propertyType,
          emirate: emirate,
          transaction_type: transactionType,
          property_value: propertyValue,
          loan_amount: loanAmount,
          developer: developer || undefined,
          is_first_property: isFirstProperty,
          tenure_years: tenureYears,
          tenure_months: tenureMonths,
          bank: bank || undefined,
          mortgage_type: mortgageType,
          rate_type: rateType,
          rate: rate || undefined,
          fixed_period: fixedPeriod || undefined,
        },
      })
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save case')
    }
  }

  const handleStageChange = async (newStage: CaseStage) => {
    try {
      await changeStageMutation.mutateAsync({ id: caseData.id, stage: newStage })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to change stage')
    }
  }

  const isPending = updateMutation.isPending

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Case #{caseData.id.slice(0, 8).toUpperCase()}
            </h2>
            <StageDropdown
              stage={caseData.stage}
              onChange={handleStageChange}
              isLoading={changeStageMutation.isPending}
              disabled={isReadOnly}
            />
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stage SLA Countdown - Near top of panel */}
        {stageSLA && stageSLA.status !== 'no_sla' && (
          <div className="mt-3">
            <SLACountdown
              status={stageSLA.status as SLAStatusValue}
              remainingHours={stageSLA.remaining_hours}
              displayText={stageSLA.display}
              label="Stage SLA"
              stageName={stageSLA.stage_name || CASE_STAGE_LABELS[caseData.stage]}
              size="sm"
            />
          </div>
        )}

        {saveError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {saveError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex mt-4 -mb-px">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'details'
                ? 'text-[#1e3a5f] border-[#1e3a5f]'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'documents'
                ? 'text-[#1e3a5f] border-[#1e3a5f]'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Bank Forms
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'activity'
                ? 'text-[#1e3a5f] border-[#1e3a5f]'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Activity
          </button>
        </div>
      </div>

      {/* Details Tab Content */}
      {activeTab === 'details' && (
        <>
          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Deal Information */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Client">
                  <button onClick={() => setShowClientPanel(true)} className="text-sm text-blue-600 hover:text-blue-800">
                    {caseData.client.name}
                  </button>
                </FormField>
                <FormField label="Application Type">
                  <div className="text-sm text-gray-900">{APPLICATION_TYPE_LABELS[caseData.application_type]}</div>
                </FormField>
              </div>

              {/* Property Category Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !isTerminal && setPropertyCategory('residential')}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1',
                    propertyCategory === 'residential'
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                      : 'border-gray-200 hover:border-gray-300',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-sm font-medium text-gray-900">Residential</span>
                </button>
                <button
                  type="button"
                  onClick={() => !isTerminal && setPropertyCategory('commercial')}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-3 px-4 rounded-lg border-2 transition-all flex flex-col items-center gap-1',
                    propertyCategory === 'commercial'
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                      : 'border-gray-200 hover:border-gray-300',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-sm font-medium text-gray-900">Commercial</span>
                </button>
              </div>

              {/* Case Type Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !isTerminal && setCaseType('fully_packaged')}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                    caseType === 'fully_packaged'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Fully Packaged
                </button>
                <button
                  type="button"
                  onClick={() => !isTerminal && setCaseType('assisted')}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                    caseType === 'assisted'
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Assisted
                </button>
              </div>
            </div>

            {/* Property Details */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Property</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Emirate *">
                  <select
                    value={emirate}
                    onChange={(e) => setEmirate(e.target.value as Emirate)}
                    disabled={isTerminal}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white disabled:opacity-50"
                  >
                    {Object.entries(EMIRATE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Transaction Type *">
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as 'primary_purchase' | 'resale' | 'buyout_equity' | 'buyout' | 'equity')}
                    disabled={isTerminal}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white disabled:opacity-50"
                  >
                    <option value="primary_purchase">Primary Purchase</option>
                    <option value="resale">Resale</option>
                    <option value="buyout_equity">Buyout + Equity</option>
                    <option value="buyout">Buyout</option>
                    <option value="equity">Equity</option>
                  </select>
                </FormField>
                <FormField label="Property Status *">
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value as 'ready' | 'off_plan')}
                    disabled={isTerminal}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white disabled:opacity-50"
                  >
                    <option value="ready">Ready</option>
                    <option value="off_plan">Under Construction</option>
                  </select>
                </FormField>
                <FormField label="Property Value (AED) *">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(sanitizeAmount(e.target.value))}
                    disabled={isTerminal}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50"
                  />
                </FormField>
              </div>

              {/* First Property Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => !isTerminal && setIsFirstProperty(true)}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                    isFirstProperty
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  First Property
                </button>
                <button
                  type="button"
                  onClick={() => !isTerminal && setIsFirstProperty(false)}
                  disabled={isTerminal}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                    !isFirstProperty
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    isTerminal && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  Second+ Property
                </button>
              </div>

              {propertyType === 'off_plan' && (
                <FormField label="Developer">
                  <input
                    type="text"
                    value={developer}
                    onChange={(e) => setDeveloper(e.target.value)}
                    disabled={isTerminal}
                    placeholder="e.g., Emaar, DAMAC"
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50"
                  />
                </FormField>
              )}
            </div>

            {/* Loan Details */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loan</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Loan Amount (AED) *">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(sanitizeAmount(e.target.value))}
                    disabled={isTerminal}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50"
                  />
                </FormField>
                <FormField label="Mortgage Term *">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={25}
                      value={tenureYears}
                      onChange={(e) => setTenureYears(parseInt(e.target.value) || 1)}
                      disabled={isTerminal}
                      className="w-16 h-9 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] text-center disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-500">yrs</span>
                    <input
                      type="number"
                      min={0}
                      max={11}
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(parseInt(e.target.value) || 0)}
                      disabled={isTerminal}
                      className="w-16 h-9 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] text-center disabled:opacity-50"
                    />
                    <span className="text-xs text-gray-500">mo</span>
                  </div>
                </FormField>
              </div>
            </div>

            {/* Bank Product */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bank Product</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Bank *">
                  <BankDropdown value={bank} onChange={setBank} banks={banks} disabled={isTerminal} />
                </FormField>
                <FormField label="Mortgage Type *">
                  <select
                    value={mortgageType}
                    onChange={(e) => setMortgageType(e.target.value as MortgageType)}
                    disabled={isTerminal}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white disabled:opacity-50"
                  >
                    {Object.entries(MORTGAGE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Rate Type *">
                  <select
                    value={rateType}
                    onChange={(e) => setRateType(e.target.value as 'fixed' | 'variable')}
                    disabled={isTerminal}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white disabled:opacity-50"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="variable">Variable</option>
                  </select>
                </FormField>
                <FormField label="Rate (%) *">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(sanitizeAmount(e.target.value))}
                    disabled={isTerminal}
                    placeholder="e.g., 4.99"
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:opacity-50"
                  />
                </FormField>
                {rateType === 'fixed' && (
                  <FormField label="Fixed Period">
                    <select
                      value={fixedPeriod}
                      onChange={(e) => setFixedPeriod(e.target.value as FixedPeriod | '')}
                      disabled={isTerminal}
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-white disabled:opacity-50"
                    >
                      <option value="">Select period...</option>
                      {Object.entries(FIXED_PERIOD_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </FormField>
                )}
              </div>
            </div>

            {/* Eligibility / LTV Summary */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Eligibility</h3>
              <div className="grid grid-cols-1">
                {(() => {
                  const ltvNum = parseFloat(ltv)
                  const ltvLimit = propertyType === 'off_plan' ? 50 : (isFirstProperty ? 80 : 65)
                  const isWithinLimit = ltvNum > 0 && ltvNum <= ltvLimit
                  return (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-[10px] font-medium text-gray-400 uppercase block mb-1">LTV (Loan to Value)</span>
                      <span className={cn(
                        'text-lg font-bold',
                        ltvNum > 0 ? (isWithinLimit ? 'text-green-600' : 'text-red-600') : 'text-gray-400'
                      )}>
                        {ltvNum > 0 ? `${ltvNum.toFixed(1)}%` : '-'}
                      </span>
                      <span className="text-xs text-gray-500 block mt-0.5">
                        {ltvNum > 0 ? (isWithinLimit ? `Within ${ltvLimit}% limit` : `Exceeds ${ltvLimit}% limit`) : `Limit: ${ltvLimit}%`}
                      </span>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Footer */}
          {!isTerminal && canEdit && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Documents Tab Content */}
      {activeTab === 'documents' && (
        <div className="flex-1 overflow-y-auto p-6">
          <CaseDocumentTab caseId={caseData.id} />
        </div>
      )}

      {/* Activity Tab Content */}
      {activeTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-6">
          <ActivityTimeline recordType="case" recordId={caseData.id} />
        </div>
      )}

      {/* Client Side Panel */}
      {showClientPanel && (
        <ClientSidePanel
          clientId={caseData.client.id}
          onClose={() => setShowClientPanel(false)}
          hideCreateCase
        />
      )}
    </>
  )
}

function StageDropdown({
  stage,
  onChange,
  isLoading,
  disabled
}: {
  stage: CaseStage
  onChange: (stage: CaseStage) => void
  isLoading: boolean
  disabled?: boolean
}) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingStage, setPendingStage] = useState<CaseStage | null>(null)

  const handleChange = (newStage: CaseStage) => {
    if (isTerminalStage(newStage)) {
      setPendingStage(newStage)
      setShowConfirmation(true)
    } else {
      onChange(newStage)
    }
  }

  const confirmChange = () => {
    if (pendingStage) {
      onChange(pendingStage)
      setShowConfirmation(false)
      setPendingStage(null)
    }
  }

  const cancelChange = () => {
    setShowConfirmation(false)
    setPendingStage(null)
  }

  return (
    <>
      <select
        value={stage}
        onChange={(e) => handleChange(e.target.value as CaseStage)}
        disabled={isLoading || disabled}
        className={cn(
          'px-2 py-0.5 text-xs font-medium rounded border-0 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          stageColors[stage]
        )}
      >
        <optgroup label="Active Stages">
          {CASE_STAGES.active.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </optgroup>
        <optgroup label="Hold">
          {CASE_STAGES.hold.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </optgroup>
        <optgroup label="Terminal">
          {CASE_STAGES.terminal.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </optgroup>
      </select>

      {/* Terminal Stage Confirmation Modal */}
      {showConfirmation && pendingStage && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={cancelChange} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] bg-white z-[60] shadow-xl rounded-xl">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Confirm Stage Change</h3>
              <p className="text-xs text-gray-500 mt-1">
                You are about to move this case to: <strong>{getStageLabel(pendingStage)}</strong>
              </p>
            </div>
            <div className="p-4">
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-xs text-amber-700">
                  This action cannot be easily undone. The case will be marked as completed.
                </p>
              </div>
            </div>
            <div className="flex gap-2 p-4 pt-0">
              <button
                onClick={cancelChange}
                className="flex-1 px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmChange}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
