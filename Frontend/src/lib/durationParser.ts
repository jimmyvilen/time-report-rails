const PATTERN = /(\d+(?:\.\d+)?)\s*(h|m)\b/gi

export function parseDuration(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  const trimmed = raw.trim().toLowerCase()
  if (trimmed.startsWith('-')) return null

  const matches = [...trimmed.matchAll(PATTERN)]
  if (matches.length === 0) return null

  let total = 0
  let lastEnd = 0

  for (const match of matches) {
    const idx = match.index!
    if (trimmed.slice(lastEnd, idx).trim().length > 0) return null

    const n = parseFloat(match[1])
    if (!isFinite(n) || n < 0) return null

    total += match[2].toLowerCase() === 'h'
      ? Math.round(n * 60)
      : Math.round(n)
    lastEnd = idx + match[0].length
  }

  if (trimmed.slice(lastEnd).trim().length > 0) return null
  return total > 0 ? total : null
}

export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
