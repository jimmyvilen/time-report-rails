import { api } from './client'

export interface User {
  id: number
  email: string
  name: string | null
  isAdmin: boolean
  avatarUrl: string | null
  jiraUrl: string | null
  jiraEmail: string | null
  jiraApiTokenSet: boolean
  jiraIntegrationSystem: string
}

export const getMe = () => api.get<User>('/api/auth/me')
export const getSetupStatus = () => api.get<{ usersExist: boolean }>('/api/auth/setup-status')

export const login = (email: string, password: string) =>
  api.post<User>('/api/auth/login', { email, password })

export const logout = () => api.post<void>('/api/auth/logout')

export const register = (email: string, password: string, passwordConfirmation: string) =>
  api.post<User>('/api/auth/register', { email, password, passwordConfirmation })

export const setup = (email: string, password: string, passwordConfirmation: string) =>
  api.post<User>('/api/auth/setup', { email, password, passwordConfirmation })
