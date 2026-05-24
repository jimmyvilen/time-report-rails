import { useQuery } from '@tanstack/react-query'
import { getWeeklySummary } from '../../api/timeEntries'
import { mondayOfWeek } from '../../lib/dateUtils'
import { formatMinutes } from '../../lib/durationParser'

interface Props {
  date: string
  onDateClick: (d: string) => void
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

export function WeeklySummary({ date, onDateClick }: Props) {
  const monday = mondayOfWeek(date)
  const { data } = useQuery({
    queryKey: ['weekly-summary', monday],
    queryFn: () => getWeeklySummary(date),
  })

  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
            Vecka {data?.weekNumber}
          </span>
          <span className="text-xs text-[var(--foreground-muted)]">
            {formatMinutes(data?.totalMinutes ?? 0)} totalt
          </span>
        </div>

        <div className="space-y-1">
          {(data?.days ?? []).map(day => {
            const isSelected = day.date === date
            return (
              <button
                key={day.date}
                onClick={() => onDateClick(day.date)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'text-[var(--foreground-muted)] hover:bg-[var(--background-elevated)] hover:text-[var(--foreground)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-24 capitalize font-medium text-left">{formatDayLabel(day.date)}</span>
                  {day.firstStart && day.lastEnd && (
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {day.firstStart}–{day.lastEnd}
                    </span>
                  )}
                </div>
                <span className={day.totalMinutes > 0 ? 'text-[var(--foreground)]' : 'text-[var(--foreground-muted)]'}>
                  {day.totalMinutes > 0 ? formatMinutes(day.totalMinutes) : '–'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
