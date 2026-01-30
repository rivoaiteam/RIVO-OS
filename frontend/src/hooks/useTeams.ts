import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Team {
  id: string;
  name: string;
  channel: string;
  channel_name: string;
  team_leader: string | null;
  team_leader_name: string | null;
  mortgage_specialist: string | null;
  ms_name: string | null;
  process_officer: string | null;
  po_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const data = await api.get<Team[]>('/teams/');
      return data;
    },
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: async () => {
      const data = await api.get<Team>(`/teams/${id}/`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teamData: Partial<Team>) => {
      const data = await api.post<Team>('/teams/', teamData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...teamData }: Partial<Team> & { id: string }) => {
      const data = await api.patch<Team>(`/teams/${id}/`, teamData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/teams/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useOrgChart() {
  return useQuery({
    queryKey: ['teams', 'org-chart'],
    queryFn: async () => {
      const data = await api.get('/teams/org_chart/');
      return data;
    },
  });
}
