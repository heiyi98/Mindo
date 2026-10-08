import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createLoginServerClient, verifyAccessToken } from '@/lib/supabase/server'
import { ensureCurrentUser } from '@/lib/auth/ensureCurrentUser'

// 备用入口：只有当 Alethego 的邮件模板用的是 token_hash 形式的链接
// （/api/auth/confirm?token_hash=...&type=...）时才会走到这里。默认模板走的是
// PKCE 授权码形式，汇到 /api/auth/callback，那边是主路径。
// 验证成功后同样先 ensure_current_user，确保 public.users 里有这个人。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (token_hash && type) {
    const login = await createLoginServerClient()
    const { data: verified, error } = await login.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const { supabase, user } = await verifyAccessToken(login, verified.session?.access_token)
      if (user) await ensureCurrentUser(supabase, user)

      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
