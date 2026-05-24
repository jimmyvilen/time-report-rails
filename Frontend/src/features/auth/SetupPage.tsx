import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setup } from '../../api/auth'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { today } from '../../lib/dateUtils'

export function SetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => setup(email, password, confirm),
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
        <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Välkommen</h1>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">Skapa ett administratörskonto för att komma igång.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="E-post" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          <Input label="Lösenord (minst 8 tecken)" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Input label="Bekräfta lösenord" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <Button type="submit" variant="primary" loading={mutation.isPending}>Skapa konto</Button>
        </form>
      </div>
    </div>
  )
}
