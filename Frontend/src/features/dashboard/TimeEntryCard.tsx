import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TimeEntry } from '../../api/timeEntries'
import { deleteTimeEntry, duplicateTimeEntry, pushToJira } from '../../api/timeEntries'
import { formatMinutes } from '../../lib/durationParser'

interface Props {
  entry: TimeEntry
  date: string
  onEdit: (entry: TimeEntry) => void
}

export function TimeEntryCard({ entry, date, onEdit }: Props) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['time-entries', date] })
    qc.invalidateQueries({ queryKey: ['weekly-summary'] })
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTimeEntry(entry.id),
    onSuccess: invalidate,
  })

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateTimeEntry(entry.id),
    onSuccess: invalidate,
  })

  const [pushError, setPushError] = useState<string | null>(null)

  const pushMutation = useMutation({
    mutationFn: () => pushToJira(entry.id),
    onSuccess: () => { setPushError(null); invalidate() },
    onError: (err: unknown) => {
      setPushError(err instanceof Error ? err.message : 'Kunde inte skicka till Jira')
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-xl border border-[var(--border)] bg-[var(--background-card)] hover:bg-[var(--background-card-hover)] transition-colors"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing touch-none text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          aria-label="Dra för att sortera"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </button>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">

            {/* Left: title + description */}
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                {entry.taskJiraKey && (
                  <a
                    href={entry.taskJiraUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    [{entry.taskJiraKey}]
                  </a>
                )}
                <span className="text-sm font-medium text-[var(--foreground)] truncate">
                  {entry.taskTitle}
                </span>
              </div>
              {entry.description && (
                <p className="mt-0.5 break-words text-sm text-[var(--foreground-muted)] line-clamp-2">
                  {entry.description}
                </p>
              )}
            </div>

            {/* Right: actions + duration */}
            <div className="flex shrink-0 items-center gap-3 text-right">

              {/* Actions */}
              <div className="flex items-center gap-1">
                {entry.taskJiraUrl && (
                  entry.isPushed ? (
                    <span
                      className="rounded-lg p-1.5 text-[var(--success)] cursor-default"
                      title={`Skickad till Jira${entry.pushedAt ? ' ' + entry.pushedAt.slice(0, 10) : ''}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : (
                    <button
                      onClick={() => pushMutation.mutate()}
                      disabled={
                        pushMutation.isPending ||
                        entry.effectiveDurationMinutes <= 0 ||
                        !entry.startTime ||
                        !entry.endTime
                      }
                      className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        entry.effectiveDurationMinutes <= 0
                          ? 'Ingen tid registrerad'
                          : !entry.startTime || !entry.endTime
                            ? 'Start- och sluttid krävs för att skicka till Jira'
                            : 'Skicka till Jira'
                      }
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </button>
                  )
                )}

                <button
                  onClick={() => duplicateMutation.mutate()}
                  disabled={duplicateMutation.isPending}
                  className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
                  title="Duplicera"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <button
                  onClick={() => onEdit(entry)}
                  className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                  title="Redigera"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                <button
                  onClick={() => { if (confirm('Är du säker på att du vill radera denna tidsrapport?')) deleteMutation.mutate() }}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
                  title="Radera"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Duration */}
              <div className="w-20">
                <div className="text-sm font-semibold text-[var(--foreground)] text-right">
                  {entry.effectiveDurationMinutes > 0 ? formatMinutes(entry.effectiveDurationMinutes) : ''}
                </div>
                <div className="text-xs text-[var(--foreground-muted)] text-right">
                  {entry.startTime && entry.endTime
                    ? `${entry.startTime}–${entry.endTime}`
                    : entry.startTime
                      ? `${entry.startTime}–`
                      : ' '}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      {pushError && (
        <p className="px-4 pb-2 text-xs text-[var(--danger)]">{pushError}</p>
      )}
    </div>
  )
}
