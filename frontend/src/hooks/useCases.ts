/**
 * React Query hooks for Case management.
 * Connects to the Django backend API with pagination support.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type {
  CaseData,
  CaseListItem,
  CreateCaseData,
  UpdateCaseData,
  CasesQueryParams,
  CaseStage,
  PaginatedResponse,
} from '@/types/mortgage'
import {
  ACTIVE_STAGES,
  HOLD_STAGES,
  TERMINAL_STAGES,
  CASE_STAGE_LABELS,
} from '@/types/mortgage'

/**
 * Case stages grouped by category for dropdowns and filters.
 */
export const CASE_STAGES = {
  active: ACTIVE_STAGES.map((stage) => ({
    value: stage,
    label: CASE_STAGE_LABELS[stage],
  })),
  hold: HOLD_STAGES.map((stage) => ({
    value: stage,
    label: CASE_STAGE_LABELS[stage],
  })),
  terminal: TERMINAL_STAGES.map((stage) => ({
    value: stage,
    label: CASE_STAGE_LABELS[stage],
  })),
} as const

/**
 * Get stage category for styling.
 */
export function getStageCategory(stage: CaseStage): 'active' | 'hold' | 'terminal' {
  if (HOLD_STAGES.includes(stage)) return 'hold'
  if (TERMINAL_STAGES.includes(stage)) return 'terminal'
  return 'active'
}

/**
 * Get stage label from value.
 */
export function getStageLabel(stage: CaseStage): string {
  return CASE_STAGE_LABELS[stage] || stage
}

/**
 * Check if stage is terminal.
 */
export function isTerminalStage(stage: CaseStage): boolean {
  return TERMINAL_STAGES.includes(stage)
}

/**
 * Hook for fetching paginated cases.
 */
export function useCases(params: CasesQueryParams = {}) {
  const { page = 1, page_size = 10, search = '', stage = 'all', bank } = params

  return useQuery({
    queryKey: ['cases', { page, page_size, search, stage, bank }],
    queryFn: async (): Promise<PaginatedResponse<CaseListItem>> => {
      return await api.get<PaginatedResponse<CaseListItem>>('/cases/', {
        page,
        page_size,
        search: search || undefined,
        stage: stage !== 'all' ? stage : undefined,
        bank: bank || undefined,
      })
    },
  })
}

/**
 * Hook for fetching a single case with full details.
 */
export function useCase(id: string | null) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: async (): Promise<CaseData> => {
      return await api.get<CaseData>(`/cases/${id}/`)
    },
    enabled: !!id && id !== 'new',
  })
}

/**
 * Hook for creating a new case.
 * Validates client.can_create_case before creating.
 */
export function useCreateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCaseData) => {
      try {
        return await api.post<CaseData>('/cases/', data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to create case')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

/**
 * Hook for updating a case.
 * Prevents changes to terminal cases.
 */
export function useUpdateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCaseData }) => {
      try {
        return await api.patch<CaseData>(`/cases/${id}/`, data)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to update case')
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.id] })
    },
  })
}

/**
 * Hook for changing case stage.
 * Enforces stage transition rules:
 * - Cannot move from terminal stages
 * - Tracks stage_changed_at on each transition
 */
export function useChangeCaseStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: CaseStage }) => {
      try {
        return await api.post<CaseData>(`/cases/${id}/change_stage/`, { stage })
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error(
            (error.data as { error?: string })?.error || 'Failed to change case stage'
          )
        }
        throw error
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['cases', variables.id] })
    },
  })
}

/**
 * Bank type for bank selection dropdown.
 */
export interface Bank {
  id: string
  name: string
  icon: string
}

/**
 * Bank product type for rate selection.
 */
export interface BankProduct {
  id: string
  bank_id: string
  name: string
  rate_type: 'fixed' | 'variable'
  min_rate: string
  max_rate: string
  min_ltv: number
  max_ltv: number
  min_tenure: number
  max_tenure: number
  is_active: boolean
}

/**
 * Hook for deleting a case.
 */
export function useDeleteCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.delete(`/cases/${id}/`)
      } catch (error) {
        if (error instanceof ApiError) {
          throw new Error((error.data as { error?: string })?.error || 'Failed to delete case')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
    },
  })
}

/**
 * Hook for fetching banks for dropdown selection.
 */
export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async (): Promise<Bank[]> => {
      return await api.get<Bank[]>('/cases/banks/')
    },
  })
}

/**
 * Hook for fetching bank products.
 */
export function useBankProducts(bankId: string | null) {
  return useQuery({
    queryKey: ['bank-products', bankId],
    queryFn: async (): Promise<BankProduct[]> => {
      return await api.get<BankProduct[]>(`/banks/${bankId}/products/`)
    },
    enabled: !!bankId,
  })
}

// ============================================
// Stage SLA Configuration Hooks
// ============================================

/**
 * Stage SLA Configuration type.
 */
export interface StageSLAConfig {
  id: string
  from_stage: string
  from_stage_display: string
  to_stage: string
  to_stage_display: string
  sla_hours: number
  breach_percent: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Hook for fetching stage SLA configurations.
 */
export function useStageSLAConfigs() {
  return useQuery({
    queryKey: ['stage-sla-configs'],
    queryFn: async (): Promise<StageSLAConfig[]> => {
      return await api.get<StageSLAConfig[]>('/stage-sla-configs/')
    },
  })
}

/**
 * Hook for updating a stage SLA configuration.
 */
export function useUpdateStageSLAConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, sla_hours, breach_percent }: { id: string; sla_hours?: number; breach_percent?: number }) => {
      const data: { sla_hours?: number; breach_percent?: number } = {}
      if (sla_hours !== undefined) data.sla_hours = sla_hours
      if (breach_percent !== undefined) data.breach_percent = breach_percent
      return await api.patch<StageSLAConfig>(`/stage-sla-configs/${id}/`, data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stage-sla-configs'] })
      await queryClient.refetchQueries({ queryKey: ['stage-sla-configs'] })
    },
  })
}

/**
 * Hook for creating a new stage SLA configuration.
 */
export function useCreateStageSLAConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { from_stage: string; to_stage: string; sla_hours: number }) => {
      return await api.post<StageSLAConfig>('/stage-sla-configs/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-sla-configs'] })
    },
  })
}

// ============================================
// Client to Case SLA Configuration Hooks
// ============================================

/**
 * Client to Case SLA Configuration type.
 */
export interface ClientToCaseSLAConfig {
  id: string
  sla_type: string
  sla_type_display: string
  sla_hours: number
  breach_percent: number
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Hook for fetching Client to Case SLA configuration.
 */
export function useClientToCaseSLAConfig() {
  return useQuery({
    queryKey: ['client-to-case-sla'],
    queryFn: async (): Promise<ClientToCaseSLAConfig> => {
      return await api.get<ClientToCaseSLAConfig>('/client-to-case-sla/')
    },
  })
}

/**
 * Hook for updating Client to Case SLA configuration.
 */
export function useUpdateClientToCaseSLAConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, sla_hours, breach_percent }: { id: string; sla_hours?: number; breach_percent?: number }) => {
      const data: { sla_hours?: number; breach_percent?: number } = {}
      if (sla_hours !== undefined) data.sla_hours = sla_hours
      if (breach_percent !== undefined) data.breach_percent = breach_percent
      return await api.patch<ClientToCaseSLAConfig>(`/client-to-case-sla/${id}/`, data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['client-to-case-sla'] })
      await queryClient.refetchQueries({ queryKey: ['client-to-case-sla'] })
    },
  })
}

/**
 * Calculate LTV percentage.
 */
export function calculateLTV(loanAmount: string | null, propertyValue: string | null): string {
  const loan = parseFloat(loanAmount || '0')
  const property = parseFloat(propertyValue || '0')

  if (property <= 0 || loan <= 0) {
    return '0.00'
  }

  const ltv = (loan / property) * 100
  return ltv.toFixed(2)
}
