import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Season {
  id: string
  name: string
  starts_at: string
  ends_at: string
  status: 'active' | 'upcoming' | 'ended'
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  first_name: string
  avatar_url: string | null
  total_points: number
  rank: number
}

export interface FlashDeal {
  id: string
  provider_id: string
  provider_name: Record<string, string>
  title: Record<string, string>
  description: Record<string, string>
  original_price: number
  deal_price: number
  early_bird_price: number | null
  early_bird_slots: number
  total_slots: number
  remaining_slots: number
  starts_at: string
  ends_at: string
}

export interface GroupBuy {
  id: string
  provider_id: string
  provider_name: Record<string, string>
  title: Record<string, string>
  description: Record<string, string>
  base_price: number
  min_participants: number
  max_participants: number
  current_participants: number
  tiers: { count: number; discount_pct: number }[]
  ends_at: string
}

export interface MysteryTask {
  id: string
  provider_id: string
  provider_name: Record<string, string>
  description: Record<string, string>
  reward_points: number
  reward_bonus: number
  status: 'available' | 'claimed' | 'submitted' | 'approved' | 'rejected'
  claimed_by: string | null
}

export interface Club77Membership {
  tier: string
  slot_number: number
  joined_at: string
  benefits: string[]
}

export interface Club77Status {
  membership: Club77Membership | null
  is_member: boolean
}

export interface Club77Slot {
  tier: string
  total: number
  taken: number
  available: number
}

// ─── Season & Leaderboard ───────────────────────────────────────────────────

export function useActiveSeason() {
  return useQuery({
    queryKey: ['season', 'active'],
    queryFn: () => api.get<Season>('/api/v1/gamification/season'),
  })
}

export function useLeaderboard(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['leaderboard', page, limit],
    queryFn: () =>
      api.get<{ data: LeaderboardEntry[]; total: number }>(
        `/api/v1/gamification/leaderboard?page=${page}&limit=${limit}`,
      ),
  })
}

export function useMyRank() {
  return useQuery({
    queryKey: ['my-rank'],
    queryFn: () => api.get<{ rank: number | null; points: number }>('/api/v1/gamification/my-rank'),
  })
}

// ─── Flash Deals ────────────────────────────────────────────────────────────

export function useFlashDeals(page = 1) {
  return useQuery({
    queryKey: ['flash-deals', page],
    queryFn: () =>
      api.get<{ data: FlashDeal[]; total: number }>(
        `/api/v1/gamification/flash-deals?page=${page}&limit=20`,
      ),
    refetchInterval: 30_000,
  })
}

export function usePurchaseFlashDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dealId: string) =>
      api.post(`/api/v1/gamification/flash-deals/${dealId}/purchase`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flash-deals'] }),
  })
}

// ─── Group Buy ──────────────────────────────────────────────────────────────

export function useGroupBuys(page = 1) {
  return useQuery({
    queryKey: ['group-buys', page],
    queryFn: () =>
      api.get<{ data: GroupBuy[]; total: number }>(
        `/api/v1/gamification/group-buys?page=${page}&limit=20`,
      ),
    refetchInterval: 30_000,
  })
}

export function useJoinGroupBuy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (buyId: string) =>
      api.post(`/api/v1/gamification/group-buys/${buyId}/join`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-buys'] }),
  })
}

// ─── Mystery Shopper ────────────────────────────────────────────────────────

export function useMysteryTasks() {
  return useQuery({
    queryKey: ['mystery-tasks'],
    queryFn: () => api.get<MysteryTask[]>('/api/v1/gamification/mystery-tasks'),
  })
}

export function useClaimMysteryTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/api/v1/gamification/mystery-tasks/${taskId}/claim`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mystery-tasks'] }),
  })
}

export function useSubmitMysteryTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: Record<string, unknown> }) =>
      api.post(`/api/v1/gamification/mystery-tasks/${taskId}/submit`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mystery-tasks'] }),
  })
}

// ─── Club 77 ────────────────────────────────────────────────────────────────

export function useClub77Status() {
  return useQuery({
    queryKey: ['club77', 'status'],
    queryFn: () => api.get<Club77Status>('/api/v1/gamification/club-77/status'),
  })
}

export function useClub77Slots() {
  return useQuery({
    queryKey: ['club77', 'slots'],
    queryFn: () => api.get<Club77Slot[]>('/api/v1/gamification/club-77/slots'),
  })
}

export function useJoinClub77() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tier: string) =>
      api.post('/api/v1/gamification/club-77/join', { tier }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club77'] })
    },
  })
}
