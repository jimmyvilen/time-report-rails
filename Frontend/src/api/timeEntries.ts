import { api } from './client'

export interface TimeEntry {
  id: number
  date: string
  description: string | null
  position: number
  taskId: number
  taskTitle: string
  taskJiraUrl: string | null
  taskJiraKey: string | null
  projectId: number | null
  projectName: string | null
  startTime: string | null
  endTime: string | null
  durationMinutes: number | null
  effectiveDurationMinutes: number
  jiraWorklogId: string | null
  pushedToSystem: string | null
  pushedAt: string | null
  isPushed: boolean
  createdAt: string
  updatedAt: string
}

export interface WeekDay {
  date: string
  dayName: string
  firstStart: string | null
  lastEnd: string | null
  totalMinutes: number
}

export interface WeeklySummary {
  weekNumber: number
  totalMinutes: number
  days: WeekDay[]
}

export const getTimeEntries = (date: string) =>
  api.get<TimeEntry[]>(`/api/time-entries?date=${date}`)

export const createTimeEntry = (data: {
  taskId: number
  date: string
  description?: string
  startTime?: string
  endTime?: string
  durationMinutes?: number
  durationString?: string
}) => api.post<TimeEntry>('/api/time-entries', data)

export const updateTimeEntry = (id: number, data: {
  taskId?: number
  date?: string
  description?: string | null
  startTime?: string | null
  endTime?: string | null
  durationMinutes?: number | null
  durationString?: string | null
  deleteJiraWorklog?: boolean
}) => api.put<TimeEntry>(`/api/time-entries/${id}`, data)

export const deleteTimeEntry = (id: number) => api.delete<void>(`/api/time-entries/${id}`)

export const duplicateTimeEntry = (id: number) =>
  api.post<TimeEntry>(`/api/time-entries/${id}/duplicate`)

export const reorderTimeEntries = (items: { id: number; position: number }[]) =>
  api.post<void>('/api/time-entries/reorder', items)

export const getWeeklySummary = (date: string) =>
  api.get<WeeklySummary>(`/api/time-entries/weekly-summary?date=${date}`)

export const getRecentDescription = (taskId: number) =>
  api.get<{ description: string | null }>(`/api/time-entries/recent-description?task_id=${taskId}`)

export const pushToJira = (id: number) =>
  api.post<TimeEntry>(`/api/time-entries/${id}/push-to-jira`)

export const exportTimeEntries = (from?: string, to?: string) => {
  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (to) qs.set('to', to)
  window.location.href = `/api/time-entries/export${qs.size ? '?' + qs : ''}`
}
