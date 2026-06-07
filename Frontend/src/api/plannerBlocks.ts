import { api } from './client'

export interface PlannerBlock {
  id: number
  title: string
  date: string
  startTime: string | null
  endTime: string | null
  color: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type BlockColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'

export const BLOCK_COLORS: Record<BlockColor, { bg: string; border: string }> = {
  blue:   { bg: 'rgba(59,130,246,0.13)',  border: '#3b82f6' },
  green:  { bg: 'rgba(34,197,94,0.13)',   border: '#22c55e' },
  red:    { bg: 'rgba(239,68,68,0.13)',   border: '#ef4444' },
  yellow: { bg: 'rgba(234,179,8,0.13)',   border: '#eab308' },
  purple: { bg: 'rgba(168,85,247,0.13)',  border: '#a855f7' },
  orange: { bg: 'rgba(249,115,22,0.13)',  border: '#f97316' },
}

export const DEFAULT_COLOR: BlockColor = 'blue'

export const getPlannerBlocks = (weekStart: string) =>
  api.get<PlannerBlock[]>(`/api/planner-blocks?weekStart=${weekStart}`)

export const createPlannerBlock = (data: {
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
  color?: string | null
  notes?: string | null
}) => api.post<PlannerBlock>('/api/planner-blocks', data)

export const updatePlannerBlock = (id: number, data: {
  title: string
  date: string
  startTime?: string | null
  endTime?: string | null
  color?: string | null
  notes?: string | null
}) => api.put<PlannerBlock>(`/api/planner-blocks/${id}`, data)

export const deletePlannerBlock = (id: number) =>
  api.delete<void>(`/api/planner-blocks/${id}`)
