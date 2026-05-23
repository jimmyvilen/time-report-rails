import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDailyNotes } from '../../api/dailyNotes'
import { MarkdownRenderer } from '../../components/MarkdownRenderer'

export function NotesPage() {
  const [search, setSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data } = useQuery({
    queryKey: ['notes', search, page],
    queryFn: () => getDailyNotes({ q: search || undefined, page }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(pendingSearch)
    setPage(1)
  }

  const totalCount = data?.total ?? 0

  return (
    <div className="flex-1 p-4 md:p-6 max-w-app mx-auto w-full">
      <h1 className="mb-8 text-xl font-semibold text-[var(--foreground)]">Noteringar</h1>

      <div className="divide-y divide-[var(--border)]">

        {/* Sök */}
        <div className="pb-8">
          <h2 className="mb-1 text-sm font-medium text-[var(--foreground)]">Sök</h2>
          <p className="mb-4 text-sm text-[var(--foreground-muted)]">Hitta tidigare dagliga noteringar</p>
          <form onSubmit={handleSearch} className="flex max-w-sm gap-2">
            <input
              type="search"
              placeholder="Sök noteringar..."
              value={pendingSearch}
              onChange={e => setPendingSearch(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              Sök
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="pt-8">
          <h2 className="mb-1 text-sm font-medium text-[var(--foreground)]">Dagliga noteringar</h2>
          <p className="mb-4 text-sm text-[var(--foreground-muted)]">
            {totalCount === 1 ? '1 notering' : `${totalCount} noteringar`}
          </p>

          {data?.notes.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background-elevated)] p-6 text-sm text-[var(--foreground-muted)]">
              {search ? 'Inga noteringar matchar sökningen.' : 'Inga noteringar än.'}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {(data?.notes ?? []).map(note => (
                <article key={note.id} className="py-5 first:pt-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <time className="text-xs font-medium text-[var(--accent)]">{note.date}</time>
                    <a
                      href={`/dashboard?date=${note.date}`}
                      className="shrink-0 rounded-lg p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                      title="Öppna i dashboard"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <div className="text-sm text-[var(--foreground)]">
                    <MarkdownRenderer content={note.content} />
                  </div>
                </article>
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm">
              <span className="text-[var(--foreground-muted)]">Sida {data.page} av {data.totalPages}</span>
              <div className="flex items-center gap-2">
                {data.page > 1 ? (
                  <button onClick={() => setPage(p => p - 1)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                    Föregående
                  </button>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground-muted)]/40">Föregående</span>
                )}
                {data.page < data.totalPages ? (
                  <button onClick={() => setPage(p => p + 1)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                    Nästa
                  </button>
                ) : (
                  <span className="cursor-not-allowed rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--foreground-muted)]/40">Nästa</span>
                )}
              </div>
            </nav>
          )}
        </div>

      </div>
    </div>
  )
}
