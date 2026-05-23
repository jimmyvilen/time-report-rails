import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, className = '', id, ...props
}, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground-muted)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          px-3 py-2 rounded-lg border bg-[var(--background-card)] text-[var(--foreground)]
          border-[var(--border)] placeholder:text-[var(--foreground-muted)]
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
          disabled:opacity-50
          ${error ? 'border-[var(--danger)]' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'
