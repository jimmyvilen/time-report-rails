import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { getTimeEntries, reorderTimeEntries } from '../../api/timeEntries'
import type { TimeEntry } from '../../api/timeEntries'
import { today, addDays, formatDate } from '../../lib/dateUtils'
import { formatMinutes } from '../../lib/durationParser'
import { WeeklySummary } from './WeeklySummary'
import { TimeEntryCard } from './TimeEntryCard'
import { TimeEntryForm } from './TimeEntryForm'
import { DailyNotePanel } from './DailyNotePanel'
import { Button } from '../../components/Button'

export function DashboardPage() {
  const params = new URLSearchParams(window.location.search)
  const [date, setDate] = useState(params.get('date') ?? today())
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null)

  const qc = useQueryClient()

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['time-entries', date],
    queryFn: () => getTimeEntries(date),
  })

  const totalMinutes = entries.reduce((s, e) => s + e.effectiveDurationMinutes, 0)

  const reorderMutation = useMutation({
    mutationFn: reorderTimeEntries,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['time-entries', date] }),
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = entries.findIndex(e => e.id === active.id)
    const newIndex = entries.findIndex(e => e.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...entries]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const items = reordered.map((e, i) => ({ id: e.id, position: i }))
    qc.setQueryData(['time-entries', date], reordered.map((e, i) => ({ ...e, position: i })))
    reorderMutation.mutate(items)
  }

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    setShowForm(false)
    setEditEntry(null)
    window.history.replaceState({}, '', `/dashboard?date=${newDate}`)
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditEntry(entry)
    setShowForm(true)
  }

  return (
    <div className="flex-1 p-4 md:p-6 max-w-app mx-auto w-full">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Weekly summary sidebar */}
        <WeeklySummary date={date} onDateClick={handleDateChange} />

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDateChange(addDays(date, -1))}
              className="relative z-10 rounded-lg border border-[var(--border)] p-1.5 text-[var(--foreground-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shrink-0"
              aria-label="Föregående dag"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <label className="relative flex flex-1 flex-col items-center cursor-pointer select-none">
              <span className="text-lg font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                {date}
              </span>
              <span className="text-xs text-[var(--foreground-muted)] capitalize">
                {new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date + 'T00:00:00'))}
              </span>
              <input
                type="date"
                value={date}
                onChange={e => handleDateChange(e.target.value)}
                className="absolute inset-0 opacity-0 w-full cursor-pointer"
                title="Välj datum"
              />
            </label>

            <button
              type="button"
              onClick={() => handleDateChange(addDays(date, 1))}
              className="relative z-10 rounded-lg border border-[var(--border)] p-1.5 text-[var(--foreground-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors shrink-0"
              aria-label="Nästa dag"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Actions + note panel */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              onClick={() => { setEditEntry(null); setShowForm(s => !s) }}
            >
              {showForm && !editEntry ? 'Stäng' : '+ Registrera tid'}
            </Button>
            <DailyNotePanel date={date} />
          </div>

          {/* Time entry form */}
          {showForm && (
            <TimeEntryForm
              date={date}
              editEntry={editEntry}
              onClose={() => { setShowForm(false); setEditEntry(null) }}
            />
          )}

          {/* Entries list */}
          {isLoading ? (
            <div className="text-sm text-[var(--foreground-muted)] py-4">Laddar...</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-[var(--foreground-muted)] py-4 text-center border border-dashed border-[var(--border)] rounded-xl">
              Inga tidsposter för {formatDate(date)}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {entries.map(entry => (
                    <TimeEntryCard
                      key={entry.id}
                      entry={entry}
                      date={date}
                      onEdit={e => handleEdit(e)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Daily total */}
          {totalMinutes > 0 && (
            <div className="flex justify-end">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                Totalt: {formatMinutes(totalMinutes)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
