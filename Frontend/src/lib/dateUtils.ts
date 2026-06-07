function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return toDateString(new Date())
}

export function mondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const offset = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - offset)
  return toDateString(d)
}

export function formatDayName(dateStr: string, locale = 'sv-SE'): string {
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d)
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

export function formatDate(dateStr: string, locale = 'sv-SE'): string {
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}

export function getWeekStart(dateStr: string): string {
  return mondayOfWeek(dateStr)
}

export function getWeekDays(weekStart: string): string[] {
  return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
}

export function getISOWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function formatShortDate(dateStr: string, locale = 'sv-SE'): string {
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d)
}

export function formatShortDayName(dateStr: string, locale = 'sv-SE'): string {
  const d = new Date(dateStr + 'T00:00:00')
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
}
