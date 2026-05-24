import { api } from './client'
import type { User } from './auth'

export const getProfile = () => api.get<User>('/api/profile')

export const updateProfile = (data: {
  name?: string
  avatarUrl?: string
  jiraUrl?: string
  jiraEmail?: string
  jiraApiToken?: string
  jiraIntegrationSystem?: string
  password?: string
  passwordConfirmation?: string
}) => api.patch<User>('/api/profile', data)
