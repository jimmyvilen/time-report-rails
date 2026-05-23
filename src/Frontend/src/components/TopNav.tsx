import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMe, logout } from '../api/auth'
import { today } from '../lib/dateUtils'

export function TopNav() {
  const { data: user } = useQuery({ queryKey: ['auth/me'], queryFn: getMe })
  const qc = useQueryClient()
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear()
      window.location.href = '/login'
    },
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { href: `/dashboard?date=${today()}`, label: 'Dashboard' },
    { href: '/projects', label: 'Projekt' },
    { href: '/tasks', label: 'Uppgifter' },
    { href: '/notes', label: 'Anteckningar' },
    { href: '/export', label: 'Exportera' },
  ]

  const isActive = (href: string) =>
    window.location.pathname.startsWith(href.split('?')[0])

  return (
    <nav className="sticky top-0 z-50 bg-[var(--background-card)] border-b border-[var(--border)]">
      <div className="max-w-app mx-auto px-4 flex items-center h-14 gap-6">
        <span className="font-semibold text-[var(--foreground)] shrink-0">TimeReport</span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? 'text-[var(--accent)] bg-[var(--background-elevated)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-elevated)]'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 ml-auto">
          <a href="/profile" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
            {user?.name ?? user?.email}
          </a>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-sm text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-colors"
          >
            Logga ut
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto text-[var(--foreground-muted)] p-2"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--background-card)] px-4 py-3 flex flex-col gap-1">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded text-sm text-[var(--foreground)] hover:bg-[var(--background-elevated)]"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a href="/profile" className="px-3 py-2 rounded text-sm text-[var(--foreground)] hover:bg-[var(--background-elevated)]" onClick={() => setMobileOpen(false)}>
            Profil
          </a>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-left px-3 py-2 rounded text-sm text-[var(--danger)] hover:bg-[var(--background-elevated)]"
          >
            Logga ut
          </button>
        </div>
      )}
    </nav>
  )
}
