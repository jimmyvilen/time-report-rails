import { api } from './client'

export interface Project {
  id: number
  name: string
  description: string | null
  isArchived: boolean
  userId: number
  taskCount: number
  totalMinutes: number
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends Project {
  tasks: ProjectTask[]
}

export interface ProjectTask {
  id: number
  title: string
  description: string | null
  jiraUrl: string | null
  jiraKey: string | null
  projectId: number | null
  isFavorite: boolean
  isArchived: boolean
}

export const getProjects = () => api.get<Project[]>('/api/projects')
export const getProject = (id: number) =>
  api.get<{ project: ProjectDetail; unassignedTasks: ProjectTask[] }>(`/api/projects/${id}`)

export const createProject = (name: string, description?: string) =>
  api.post<Project>('/api/projects', { name, description })

export const updateProject = (id: number, name: string, description?: string) =>
  api.put<Project>(`/api/projects/${id}`, { name, description })

export const deleteProject = (id: number) => api.delete<void>(`/api/projects/${id}`)

export const archiveProject = (id: number) => api.patch<Project>(`/api/projects/${id}/archive`)
export const unarchiveProject = (id: number) => api.patch<Project>(`/api/projects/${id}/unarchive`)

export const addTaskToProject = (projectId: number, taskId: number) =>
  api.patch<void>(`/api/projects/${projectId}/add-task`, { taskId })

export const removeTaskFromProject = (projectId: number, taskId: number) =>
  api.patch<void>(`/api/projects/${projectId}/remove-task`, { taskId })
