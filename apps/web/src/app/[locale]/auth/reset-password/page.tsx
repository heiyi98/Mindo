'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('passwordMismatch'))
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-center" style={{ color: 'hsl(var(--foreground))' }}>
            {t('title')}
          </h1>
          <p className="text-sm text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('passwordPlaceholder')}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:border-ring"
          />
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder={t('confirmPlaceholder')}
            required
            className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:border-ring"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
          >
            {loading ? '...' : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
