import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 每个请求顺手刷新一次会话 cookie（令牌快过期时续期）。
// - 'user'：普通用户，会话属于 Alethego 身份项目
// - 'staff'：后台管理员（/admin、/api/admin），会话属于 Mindo 项目自己的 Supabase Auth
export async function updateSession(request: NextRequest, kind: 'user' | 'staff' = 'user') {
  let supabaseResponse = NextResponse.next({ request })

  const [url, key] =
    kind === 'staff'
      ? [process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!]
      : [process.env.NEXT_PUBLIC_ALETHEGO_URL!, process.env.NEXT_PUBLIC_ALETHEGO_PUBLISHABLE_KEY!]

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
    ...(kind === 'user' ? { auth: { flowType: 'pkce' as const } } : {}),
  })

  if (kind === 'staff') {
    await supabase.auth.getUser()
  } else {
    await supabase.auth.getClaims()
  }

  return { supabaseResponse }
}
