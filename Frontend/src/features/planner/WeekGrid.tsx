import { useRef, useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { type PlannerBlock, type BlockColor, BLOCK_COLORS } from '../../api/plannerBlocks'
import { PlannerBlockCard } from './PlannerBlockCard'
import { formatShortDayName, formatShortDate, today } from '../../lib/dateUtils'

export const GRID_START_HOUR = 7
export const GRID_END_HOUR = 19
export const GRID_DURATION_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60
export const ROW_HEIGHT = 40
export const TOTAL_HEIGHT = (GRID_DURATION_MINUTES / 30) * ROW_HEIGHT
const SLOTS = Array.from({ length: GRID_DURATION_MINUTES / 30 }, (_, i) => i)

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseTimeMinutes(isoOrTime: string | null): number {
  if (!isoOrTime) return GRID_START_HOUR * 60
  const t = isoOrTime.includes('T') ? isoOrTime.split('T')[1] : isoOrTime
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface Props {
  weekDays: string[]
  blocks: PlannerBlock[]
  onSlotClick: (date: string, startTime: string, endTime: string) => void
  onBlockEdit: (block: PlannerBlock) => void
  onBlockDelete: (id: number) => void
  onBlockUpdate: (block: PlannerBlock) => void
  onBlockConvert: (block: PlannerBlock) => void
}

function DragOverlayBlock({ block }: { block: PlannerBlock }) {
  const colorKey = (block.color as BlockColor) ?? 'blue'
  const colorStyle = BLOCK_COLORS[colorKey] ?? BLOCK_COLORS.blue
  return (
    <div
      className="rounded px-2 py-1 text-xs font-medium shadow-lg"
      style={{
        background: colorStyle.bg,
        borderLeft: `3px solid ${colorStyle.border}`,
        color: colorStyle.border,
        width: 120,
        opacity: 0.9,
      }}
    >
      {block.title}
    </div>
  )
}

export function WeekGrid({
  weekDays,
  blocks,
  onSlotClick,
  onBlockEdit,
  onBlockDelete,
  onBlockUpdate,
  onBlockConvert,
}: Props) {
  const gridBodyRef = useRef<HTMLDivElement>(null)
  const [activeBlock, setActiveBlock] = useState<PlannerBlock | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const block = blocks.find(b => b.id === event.active.id)
    setActiveBlock(block ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveBlock(null)
    const { active, delta, activatorEvent } = event
    const block = blocks.find(b => b.id === active.id)
    if (!block || !gridBodyRef.current) return

    const clientX = (activatorEvent as MouseEvent).clientX + delta.x
    const clientY = (activatorEvent as MouseEvent).clientY + delta.y

    // Find which day column
    const dayEls = gridBodyRef.current.querySelectorAll<HTMLElement>('[data-date]')
    let newDate = block.date
    for (const el of dayEls) {
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) {
        newDate = el.dataset.date!
        break
      }
    }

    // Calculate time from y
    const gridRect = gridBodyRef.current.getBoundingClientRect()
    const yOffset = Math.max(0, clientY - gridRect.top)
    const rawMinutes = (yOffset / TOTAL_HEIGHT) * GRID_DURATION_MINUTES + GRID_START_HOUR * 60
    const snappedMinutes = Math.round(rawMinutes / 30) * 30

    const origStart = parseTimeMinutes(block.startTime)
    const origEnd = parseTimeMinutes(block.endTime)
    const duration = origEnd - origStart

    const newStartMin = Math.max(GRID_START_HOUR * 60, Math.min(GRID_END_HOUR * 60 - Math.max(duration, 30), snappedMinutes))
    const newEndMin = newStartMin + duration

    onBlockUpdate({
      ...block,
      date: newDate,
      startTime: `${newDate}T${minutesToTimeStr(newStartMin)}:00`,
      endTime: `${newDate}T${minutesToTimeStr(newEndMin)}:00`,
    })
  }

  function handleColumnClick(e: React.MouseEvent, date: string) {
    if ((e.target as HTMLElement).closest('[data-planner-block]')) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const yOffset = e.clientY - rect.top
    const minutesFromStart = Math.floor((yOffset / TOTAL_HEIGHT) * GRID_DURATION_MINUTES / 30) * 30
    const startMin = GRID_START_HOUR * 60 + minutesFromStart
    const endMin = Math.min(startMin + 60, GRID_END_HOUR * 60)
    onSlotClick(date, minutesToTimeStr(startMin), minutesToTimeStr(endMin))
  }

  const todayStr = today()

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex overflow-x-auto">
        {/* Time column */}
        <div className="shrink-0 w-12 relative" style={{ height: TOTAL_HEIGHT + 32 }}>
          <div style={{ height: 32 }} /> {/* header spacer */}
          <div className="relative" style={{ height: TOTAL_HEIGHT }}>
            {SLOTS.map((slot, i) => {
              const hour = GRID_START_HOUR + Math.floor(slot / 2)
              const isHour = slot % 2 === 0
              return isHour ? (
                <div
                  key={slot}
                  className="absolute right-2 text-[10px] text-[var(--foreground-muted)] leading-none"
                  style={{ top: i * ROW_HEIGHT - 6 }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              ) : null
            })}
          </div>
        </div>

        {/* Day columns */}
        <div ref={gridBodyRef} className="flex flex-1 min-w-0">
          {weekDays.map(date => {
            const dayBlocks = blocks.filter(b => b.date === date)
            const isToday = date === todayStr
            return (
              <div key={date} className="flex-1 min-w-[100px] flex flex-col border-l border-[var(--border)]">
                {/* Day header */}
                <div
                  className={`h-8 flex flex-col items-center justify-center text-center border-b border-[var(--border)] ${
                    isToday ? 'bg-[var(--background-elevated)]' : ''
                  }`}
                >
                  <span className={`text-[10px] font-medium uppercase ${isToday ? 'text-[var(--accent)]' : 'text-[var(--foreground-muted)]'}`}>
                    {formatShortDayName(date)}
                  </span>
                  <span className={`text-xs ${isToday ? 'text-[var(--accent)] font-semibold' : 'text-[var(--foreground-muted)]'}`}>
                    {formatShortDate(date)}
                  </span>
                </div>

                {/* Time slot area */}
                <div
                  data-date={date}
                  className="relative cursor-pointer"
                  style={{ height: TOTAL_HEIGHT }}
                  onClick={e => handleColumnClick(e, date)}
                >
                  {/* Grid lines */}
                  {SLOTS.map((slot, i) => (
                    <div
                      key={slot}
                      className={`absolute w-full ${slot % 2 === 0 ? 'border-t border-[var(--border)]' : 'border-t border-[var(--border)] opacity-40'}`}
                      style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                    />
                  ))}

                  {/* Blocks */}
                  {dayBlocks.map(block => (
                    <PlannerBlockCard
                      key={block.id}
                      block={block}
                      onEdit={onBlockEdit}
                      onDelete={onBlockDelete}
                      onUpdate={onBlockUpdate}
                      onConvert={onBlockConvert}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeBlock ? <DragOverlayBlock block={activeBlock} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
