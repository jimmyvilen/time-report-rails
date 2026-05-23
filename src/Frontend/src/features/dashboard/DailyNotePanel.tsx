import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDailyNote, upsertDailyNote } from '../../api/dailyNotes'
import { Button } from '../../components/Button'

interface Props {
  date: string
}

export function DailyNotePanel({ date }: Props) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['daily-note', date],
    queryFn: () => getDailyNote(date),
  })

  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')

  useEffect(() => {
    setContent(data?.content ?? '')
    setIsOpen(false)
  }, [date, data?.content])

  const mutation = useMutation({
    mutationFn: () => upsertDailyNote(date, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-note', date] })
      setIsOpen(false)
    },
  })

  const hasNote = !!data?.content

  return (
    <>
      <button
        onClick={() => setIsOpen(s => !s)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background-card)] hover:bg-[var(--background-elevated)] text-sm font-medium text-[var(--foreground)] transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Notering
        {hasNote && (
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
        )}
      </button>

      {isOpen && (
        <div className="w-full rounded-xl border border-[var(--border)] bg-[var(--background-card)] p-4">
          <div className="flex flex-col gap-3">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)] focus:border-[var(--accent)] placeholder-[var(--foreground-muted)]"
              placeholder="Skriv din dagliga notering här... (Markdown stöds)"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Stäng
              </button>
              <Button variant="primary" size="sm" loading={mutation.isPending} onClick={() => mutation.mutate()}>
                Spara
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
