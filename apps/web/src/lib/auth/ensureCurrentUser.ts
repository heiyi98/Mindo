import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * 登录后、读写任何业务数据之前调用一次：确保 public.users 里有当前
 * Alethego 用户对应的那一行（第一次登录就建，之后只同步 email）。
 * 对应数据库函数 public.ensure_current_user，见
 * supabase/migrations/20261008000000_alethego_identity.sql。
 *
 * dataClient 必须是连 Mindo 项目、带着当前 Alethego 令牌的数据client
 * （浏览器端 createClient() / 服务器端 getVerifiedSession().supabase）。
 *
 * 浏览器端和服务器端共用这一个文件，所以这里不能标 'use client'。
 */
export function defaultDisplayName(user: Pick<User, 'email' | 'user_metadata'>): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  for (const key of ['full_name', 'name', 'display_name']) {
    const v = meta[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return user.email?.split('@')[0] || 'User'
}

export async function ensureCurrentUser(
  dataClient: SupabaseClient,
  user: Pick<User, 'email' | 'user_metadata'>,
  language?: string | null
) {
  const { data, error } = await dataClient.rpc('ensure_current_user', {
    p_email: user.email ?? null,
    p_display_name: defaultDisplayName(user),
    p_language: language ?? null,
  })
  if (error) console.error('[ensureCurrentUser] failed:', error)
  return { data, error }
}
