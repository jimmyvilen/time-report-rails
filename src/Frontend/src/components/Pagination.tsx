import { Button } from './Button'

interface Props {
  page: number
  totalPages: number
  onChange: (p: number) => void
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ←
      </Button>
      <span className="text-sm text-[var(--foreground-muted)]">
        {page} / {totalPages}
      </span>
      <Button size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        →
      </Button>
    </div>
  )
}
