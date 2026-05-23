import { api } from './client'

export interface Task {
  id: number
  title: string
  description: string | null
  jiraUrl: string | null
  jiraKey: string | null
  projectId: number | null
  projectName: string | null
  isFavorite: boolean
  isArchived: boolean
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  timeEntryCount: number
  totalMinutes: number
}

export const getTasks = (params?: { q?: string; includeArchived?: boolean }) => {
  const qs = new URLSearchParams()
  if (params?.q) qs.set('q', params.q)
  if (params?.includeArchived) qs.set('includeArchived', 'true')
  return api.get<Task[]>(`/api/tasks${qs.size ? '?' + qs : ''}`)
}

export const createTask = (data: {
  title: string
  description?: string
  jiraUrl?: string
  projectId?: number
}) => api.post<Task>('/api/tasks', data)

export const updateTask = (id: number, data: {
  title: string
  description?: string | null
  jiraUrl?: string | null
  projectId?: number | null
}) => api.put<Task>(`/api/tasks/${id}`, data)

export const deleteTask = (id: number) =>
  api.delete<{ archived: boolean }>(`/api/tasks/${id}`)

export const favoriteTask = (id: number) => api.patch<Task>(`/api/tasks/${id}/favorite`)
export const restoreTask = (id: number) => api.patch<Task>(`/api/tasks/${id}/restore`)

export const fetchJiraDetails = (jiraUrl: string) =>
  api.get<{ summary: string; description: string | null; issueKey: string }>(
    `/api/tasks/jira-details?jira_url=${encodeURIComponent(jiraUrl)}`
  )
