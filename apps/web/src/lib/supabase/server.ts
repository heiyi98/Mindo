import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// 服务器端的client，跟浏览器端 lib/supabase/client.ts 一一对应：
//
// - createLoginServerClient()：连 Alethego 身份项目，读写 cookie 里的会话
//   （兑换 Google 授权码、退出、读取/续期当前会话）。Mindo 不签发任何令牌。
// - getVerifiedSession()：从 cookie 拿到 Alethego access token，用 Alethego
//   公布的公钥在本地验证签名（getClaims），验证通过才认这个人；再用同一个令牌
//   建一个连 Mindo 项目的数据client，RLS 里的 auth.uid() 就是 Alethego 用户编号。
// - createClient()：连 Mindo 项目的数据client，带上当前 cookie 里的令牌（没有就是
//   匿名）。只用来查数据；要确认"当前是谁"必须走 getVerifiedSession()。
// - createStaffServerClient()：连 Mindo 项目自己的 Supabase Auth，只给后台管理员
//   （public.admin 体系）用，跟普通用户无关。

async function cookieAdapter() {
  const cookieStore = await cookies()
  return {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch {
        // 服务端组件里不能写cookie，续期交给 proxy.ts 里的 updateSession 去做
      }
    },
  }
}

export async function createLoginServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_ALETHEGO_URL!,
    process.env.NEXT_PUBLIC_ALETHEGO_PUBLISHABLE_KEY!,
    {
      cookies: await cookieAdapter(),
      auth: { flowType: 'pkce' },
    }
  )
}

export function createDataClient(accessToken: string | null): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => accessToken }
  )
}

type AlethegoClaims = {
  sub: string
  email?: string
  role?: string
  aud?: string | string[]
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

function userFromClaims(claims: AlethegoClaims): User {
  return {
    id: claims.sub,
    email: claims.email,
    aud: Array.isArray(claims.aud) ? claims.aud[0] ?? '' : claims.aud ?? '',
    role: claims.role,
    user_metadata: claims.user_metadata ?? {},
    app_metadata: claims.app_metadata ?? {},
    created_at: '',
  } as User
}

type LoginClient = Awaited<ReturnType<typeof createLoginServerClient>>

/** 验证一个 Alethego access token；通过才返回用户，并附带用这个令牌建好的 Mindo 数据client */
export async function verifyAccessToken(
  login: LoginClient,
  token: string | null | undefined
): Promise<{ supabase: SupabaseClient; user: User | null }> {
  if (!token) return { supabase: createDataClient(null), user: null }

  const { data, error } = await login.auth.getClaims(token)
  if (error || !data?.claims?.sub) return { supabase: createDataClient(null), user: null }

  return {
    supabase: createDataClient(token),
    user: userFromClaims(data.claims as unknown as AlethegoClaims),
  }
}

export async function getVerifiedSession(): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const login = await createLoginServerClient()
  // getSession 只是读 cookie（必要时续期），本身不可信；紧接着用 getClaims
  // 对这一个令牌做签名验证，验证过的令牌才往下传给 Mindo 的数据client。
  const { data: { session } } = await login.auth.getSession()
  return verifyAccessToken(login, session?.access_token)
}

export async function createClient(): Promise<SupabaseClient> {
  const login = await createLoginServerClient()
  const { data: { session } } = await login.auth.getSession()
  return createDataClient(session?.access_token ?? null)
}

export async function createStaffServerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: await cookieAdapter() }
  )
}
