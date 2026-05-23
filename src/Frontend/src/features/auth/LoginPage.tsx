import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login } from '../../api/auth'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { today } from '../../lib/dateUtils'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: (user) => {
      qc.setQueryData(['auth/me'], user)
      window.location.href = `/dashboard?date=${today()}`
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm bg-[var(--background-card)] border border-[var(--border)] rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-6">Logga in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="E-post"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Lösenord"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <Button type="submit" variant="primary" loading={mutation.isPending}>
            Logga in
          </Button>
        </form>
        <p className="mt-4 text-sm text-[var(--foreground-muted)] text-center">
          Inget konto?{' '}
          <a href="/register" className="text-[var(--accent)] hover:underline">Registrera dig</a>
        </p>
      </div>
    </div>
  )
}
