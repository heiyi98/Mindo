'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient, createLoginClient } from '@/lib/supabase/client'
import { ensureCurrentUser } from '@/lib/auth/ensureCurrentUser'
import type { User } from '@supabase/supabase-js'

type Mode = 'login' | 'register' | 'forgot'

// 登录/注册都连 Alethego 身份项目（与 TaskApp 共用同一个账号），只提供
// 邮箱密码 + Google 两种方式。登录成功后先 ensure_current_user 建好/同步
// Mindo 自己的 public.users 那一行，再整页跳回落地页，由落地页按"有没有档案"
// 分流到仪表盘或 onboarding。Google 登录 / 邮件链接则由 /api/auth/callback 处理。
export function LoginForm() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const callbackUrl = (next?: string) =>
    `${window.location.origin}/api/auth/callback?locale=${locale}${next ? `&next=${encodeURIComponent(next)}` : ''}`

  const finishLogin = async (user: User) => {
    await ensureCurrentUser(createClient(), user, locale)
    window.location.assign(`/${locale}`)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    await createLoginClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl(),
        queryParams: { prompt: 'select_account' },
      }
    })
    setGoogleLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await createLoginClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    await finishLogin(data.user)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await createLoginClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Alethego 没开邮箱确认时注册即登录；开了就提示去邮箱点确认链接
    if (data.session && data.user) {
      await finishLogin(data.user)
      return
    }
    setSent(true)
    setLoading(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await createLoginClient().auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl('/auth/reset-password')
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center text-foreground space-y-4">
        <p className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
          {mode === 'forgot' ? t('login.resetSent') : t('login.registerSent')}
        </p>
        <button
          onClick={() => { setSent(false); setMode('login'); setEmail('') }}
          className="text-xs"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {t('login.backToLogin')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* OAuth 按钮 */}
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full py-3 rounded-lg border border-border text-foreground font-medium flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-muted transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? t('login.sending') : t('login.continueWithGoogle')}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border"/>
        <span className="text-muted-foreground text-xs">{t('login.or')}</span>
        <div className="flex-1 h-px bg-border"/>
      </div>

      {/* 登录模式 */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder')}
            required
            className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:border-ring"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('login.passwordPlaceholder')}
            required
            className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:border-ring"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
          >
            {loading ? t('login.sending') : t('login.loginTitle')}
          </button>
          <div className="flex justify-between text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <button type="button" onClick={() => { setMode('register'); setError('') }}>
              {t('login.registerTitle')}
            </button>
            <button type="button" onClick={() => { setMode('forgot'); setError('') }}>
              {t('login.forgotPassword')}
            </button>
          </div>
        </form>
      )}

      {/* 注册模式 */}
      {mode === 'register' && (
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder')}
            required
            className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:border-ring"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('setPassword.passwordPlaceholder')}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:border-ring"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
          >
            {loading ? t('login.sending') : t('login.registerTitle')}
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError('') }}
            className="text-xs text-center"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {t('login.backToLogin')}
          </button>
        </form>
      )}

      {/* 忘记密码模式 */}
      {mode === 'forgot' && (
        <form onSubmit={handleForgot} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder')}
            required
            className="w-full px-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:outline-none focus:border-ring"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
          >
            {loading ? t('login.sending') : t('login.sendResetLink')}
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError('') }}
            className="text-xs text-center"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {t('login.backToLogin')}
          </button>
        </form>
      )}
    </div>
  )
}
