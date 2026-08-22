import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log('[proxy] path:', pathname)

  // /admin（含/api/admin）不带locale前缀，全站所有后台功能现在统一走
  // public.admin独立账号体系，不再有ADMIN_EMAILS白名单这套并行机制。
  // 中间件这一层只负责刷新session、放行，不做"是不是后台人员"这个判断——
  // 那件事交给页面层（/admin/(protected)/layout.tsx的requireStaffAccount()）
  // 和API路由自己（各route.ts里的requireStaffAccount()/requireCodexAdmin()）
  // 去做，不依赖中间件matcher覆盖所有情况，见这两处的说明。必须放在下面
  // 通用/api/放行分支之前判断，否则会被那条分支提前放行（逻辑上一样，
  // 只是顺序上要写在前面避免以后误改）。
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // API路由直接放行，不经过intl处理
  if (pathname.startsWith('/api/')) {
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  const { supabaseResponse } = await updateSession(request)
  const intlResponse = intlMiddleware(request)

  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
}
