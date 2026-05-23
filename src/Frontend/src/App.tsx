import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMe, getSetupStatus } from './api/auth'
import { TopNav } from './components/TopNav'
import { PageSpinner } from './components/Spinner'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { SetupPage } from './features/auth/SetupPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { TasksPage } from './features/tasks/TasksPage'
import { NotesPage } from './features/notes/NotesPage'
import { ExportPage } from './features/export/ExportPage'
import { ProfilePage } from './features/profile/ProfilePage'

type Route =
  | 'login' | 'register' | 'setup'
  | 'dashboard' | 'projects' | 'tasks' | 'notes' | 'export' | 'profile'

function getRoute(): Route {
  const path = window.location.pathname
  if (path === '/login') return 'login'
  if (path === '/register') return 'register'
  if (path === '/setup') return 'setup'
  if (path.startsWith('/dashboard')) return 'dashboard'
  if (path.startsWith('/projects')) return 'projects'
  if (path.startsWith('/tasks')) return 'tasks'
  if (path.startsWith('/notes')) return 'notes'
  if (path.startsWith('/export')) return 'export'
  if (path.startsWith('/profile')) return 'profile'
  return 'dashboard'
}

const AUTH_ROUTES: Route[] = ['login', 'register', 'setup']

export default function App() {
  const [route, setRoute] = useState<Route>(getRoute())

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const setupQuery = useQuery({
    queryKey: ['setup-status'],
    queryFn: getSetupStatus,
    enabled: !AUTH_ROUTES.includes(route),
    retry: false,
  })

  const meQuery = useQuery({
    queryKey: ['auth/me'],
    queryFn: getMe,
    enabled: !AUTH_ROUTES.includes(route),
    retry: false,
  })

  if (!AUTH_ROUTES.includes(route) && (meQuery.isLoading || setupQuery.isLoading)) {
    return <PageSpinner />
  }

  if (!AUTH_ROUTES.includes(route) && setupQuery.data?.usersExist === false) {
    window.location.href = '/setup'
    return <PageSpinner />
  }

  if (!AUTH_ROUTES.includes(route) && meQuery.error) {
    if (route !== 'login') window.location.href = '/login'
    return <PageSpinner />
  }

  if (route === 'login') return <LoginPage />
  if (route === 'register') return <RegisterPage />
  if (route === 'setup') return <SetupPage />

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <TopNav />
      <main className="flex flex-1">
        {route === 'dashboard' && <DashboardPage />}
        {route === 'projects' && <ProjectsPage />}
        {route === 'tasks' && <TasksPage />}
        {route === 'notes' && <NotesPage />}
        {route === 'export' && <ExportPage />}
        {route === 'profile' && <ProfilePage />}
      </main>
    </div>
  )
}
