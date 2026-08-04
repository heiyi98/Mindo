import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log('[proxy] path:', pathname)

  // API路由和Keystatic后台直接放行，不经过intl处理
  // （/keystatic不带locale前缀，走intl会被当成"缺locale"307到/en/keystatic，导致后台打不开）
  if (pathname.startsWith('/api/') || pathname.startsWith('/keystatic')) {
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
