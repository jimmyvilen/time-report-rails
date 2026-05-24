import { api } from './client'

export interface DailyNote {
  id: number
  date: string
  content: string
  updatedAt: string
}

export const getDailyNote = (date: string) =>
  api.get<{ content: string | null }>(`/api/daily-notes/${date}`)

export const upsertDailyNote = (date: string, content: string) =>
  api.put<DailyNote>(`/api/daily-notes/${date}`, { content })

export const getDailyNotes = (params?: { q?: string; page?: number }) => {
  const qs = new URLSearchParams()
  if (params?.q) qs.set('q', params.q)
  if (params?.page) qs.set('page', String(params.page))
  return api.get<{ notes: DailyNote[]; total: number; totalPages: number; page: number }>(
    `/api/daily-notes${qs.size ? '?' + qs : ''}`
  )
}

export const exportNotes = (from?: string, to?: string) => {
  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  window.location.href = `/api/daily-notes/export${qs.size ? '?' + qs : ''}`
}
