'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)
  const [xLoading, setXLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/confirm?next=/`
      }
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const handleOAuthLogin = async (
    provider: 'google' | 'facebook' | 'twitter',
    setProviderLoading: (v: boolean) => void
  ) => {
    setProviderLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/`
      }
    })
    setProviderLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center text-foreground">
        <p>{t('login.checkEmail')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        onClick={() => handleOAuthLogin('google', setGoogleLoading)}
        disabled={googleLoading}
        className="w-full py-3 rounded-lg border border-border
                   text-foreground font-medium flex items-center
                   justify-center gap-3 disabled:opacity-50
                   hover:bg-muted transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? t('login.sending') : t('login.continueWithGoogle')}
      </button>

      {/* Facebook */}
      <button
        onClick={() => handleOAuthLogin('facebook', setFacebookLoading)}
        disabled={facebookLoading}
        className="w-full py-3 rounded-lg border border-border
                   text-foreground font-medium flex items-center
                   justify-center gap-3 disabled:opacity-50
                   hover:bg-muted transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
        </svg>
        {facebookLoading ? t('login.sending') : t('login.continueWithFacebook')}
      </button>

      {/* X / Twitter */}
      <button
        onClick={() => handleOAuthLogin('twitter', setXLoading)}
        disabled={xLoading}
        className="w-full py-3 rounded-lg border border-border
                   text-foreground font-medium flex items-center
                   justify-center gap-3 disabled:opacity-50
                   hover:bg-muted transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        {xLoading ? t('login.sending') : t('login.continueWithX')}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border"/>
        <span className="text-muted-foreground text-xs">{t('login.or')}</span>
        <div className="flex-1 h-px bg-border"/>
      </div>

      <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('login.emailPlaceholder')}
          required
          className="w-full px-4 py-3 rounded-lg bg-muted text-foreground
                     border border-border focus:outline-none focus:border-ring"
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground
                     font-medium disabled:opacity-50 transition-opacity"
        >
          {loading ? t('login.sending') : t('login.sendLink')}
        </button>
      </form>
    </div>
  )
}