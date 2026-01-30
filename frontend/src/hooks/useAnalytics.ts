import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AnalyticsDashboardData } from '@/types/analytics'

export function useAnalyticsDashboard(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', startDate, endDate],
    queryFn: () =>
      api.get<AnalyticsDashboardData>('/analytics/dashboard/', {
        start_date: startDate,
        end_date: endDate,
      }),
  })
}
