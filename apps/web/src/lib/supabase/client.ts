import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// 浏览器端三个client，各管各的，不要混用：
//
// 1. createLoginClient()  → 连 Alethego 身份项目。只负责登录、注册、改密码、
//    退出、读"当前是谁"。会话存在 cookie 里（@supabase/ssr 默认行为），这样
//    服务器端（API路由、服务端页面）也能从 cookie 里拿到同一份令牌去验证。
// 2. createClient()       → 连 Mindo 项目，只读写业务数据。自己不管登录，每次
//    请求都从登录client拿当前的 Alethego access token 带上（accessToken选项）。
//    注意：设了 accessToken 之后这个client的 .auth.* 会直接报错——要查"当前是谁"
//    一律用 createLoginClient().auth。
// 3. createStaffClient()  → 连 Mindo 项目自己的 Supabase Auth，只给 /admin/login
//    用（后台管理员账号，public.admin 那套独立体系），跟普通用户完全无关。

let loginClient: SupabaseClient | undefined
let dataClient: SupabaseClient | undefined

export function createLoginClient(): SupabaseClient {
  if (!loginClient) {
    loginClient = createBrowserClient(
      process.env.NEXT_PUBLIC_ALETHEGO_URL!,
      process.env.NEXT_PUBLIC_ALETHEGO_PUBLISHABLE_KEY!,
      {
        auth: {
          flowType: 'pkce',
          persistSession: true,
          autoRefreshToken: true,
          // Google 登录带回来的授权码统一由 /api/auth/callback 在服务器端兑换，
          // 浏览器端任何client都不去处理地址栏里的 code。
          detectSessionInUrl: false,
        },
      }
    )
  }
  return loginClient
}

export function createClient(): SupabaseClient {
  if (!dataClient) {
    dataClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        accessToken: async () =>
          (await createLoginClient().auth.getSession()).data.session?.access_token ?? null,
      }
    )
  }
  return dataClient
}

export function createStaffClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
