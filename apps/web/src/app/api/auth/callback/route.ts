import { type NextRequest } from 'next/server'
import { createLoginServerClient, verifyAccessToken } from '@/lib/supabase/server'
import { ensureCurrentUser } from '@/lib/auth/ensureCurrentUser'
import { redirect } from 'next/navigation'

// 必须跟项目实际支持的语言列表一致（CLAUDE.md 里写的九种）
const SUPPORTED_LOCALES = ['zh', 'zh-Hant', 'en', 'fr', 'de', 'es', 'ja', 'ko', 'it']

const NEXT_WHITELIST = ['/auth/reset-password']

// 简单解析 Accept-Language 请求头，取第一个能匹配上支持列表的语言。
// 不做完整的 quality-value(q=) 权重排序，按浏览器发送的原始顺序取第一个
// 命中的即可，够用，没必要引入额外的解析库。
function pickLocaleFromAcceptLanguage(header: string | null): string | null {
  if (!header) return null
  const candidates = header.split(',').map(s => s.split(';')[0].trim())
  for (const c of candidates) {
    if (SUPPORTED_LOCALES.includes(c)) return c
    // zh-TW / zh-HK / zh-MO 这类倾向繁体，不能直接用 base('zh') 一概而论
    if (/^zh-(TW|HK|MO)$/i.test(c)) return 'zh-Hant'
    const base = c.split('-')[0]
    if (SUPPORTED_LOCALES.includes(base)) return base
  }
  return null
}

// Alethego 的所有"带授权码跳回来"的入口都汇到这里：Google 登录、注册确认邮件、
// 忘记密码邮件（都是 PKCE 流程，地址栏带 ?code=）。在服务器端用 Alethego 登录
// client 兑换成会话（写进 cookie），然后：
//   1. ensure_current_user：确保 public.users 里有这个人（第一次就建，之后只同步email）
//   2. next 在白名单里的（重置密码）直接去 next；否则按"有没有档案"去仪表盘或 onboarding
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitLocale = searchParams.get('locale')
  const next = searchParams.get('next')

  if (code) {
    const login = await createLoginServerClient()
    const { data: exchanged, error } = await login.auth.exchangeCodeForSession(code)

    if (!error) {
      const { supabase, user } = await verifyAccessToken(login, exchanged.session?.access_token)

      if (user) {
        // 语言优先级：登录那一刻用户正在用的界面语言（最直接、最不会猜错）
        // → 浏览器 Accept-Language（前两者都没有时的合理兜底）
        // → 数据库里存的偏好
        // → 英文（最终兜底）
        const validExplicitLocale =
          explicitLocale && SUPPORTED_LOCALES.includes(explicitLocale) ? explicitLocale : null
        const browserLocale = pickLocaleFromAcceptLanguage(request.headers.get('accept-language'))

        // 第一次登录时顺手把解析出来的语言存进去；老用户不覆盖已有偏好
        const { data: userRow } = await ensureCurrentUser(
          supabase,
          user,
          validExplicitLocale || browserLocale || 'en'
        )
        const storedLanguage = (userRow as { language_preference?: string | null } | null)?.language_preference ?? null

        const lang = validExplicitLocale || browserLocale || storedLanguage || 'en'

        // 老用户如果偏好还是空的，写回这次真实生效的语言
        if (userRow && !storedLanguage) {
          await supabase.from('users').update({ language_preference: lang }).eq('id', user.id)
        }

        // 只认白名单里的 next（忘记密码邮件 → 重置密码页）。其他情况（包括
        // onboarding 带的 next=/onboarding）一律按"有没有档案"分流，跟改造前一致：
        // 已有档案的老用户不会被送回 onboarding 重复提交。
        if (next && NEXT_WHITELIST.includes(next)) {
          redirect(`/${lang}${next}`)
        }

        // 检查是否有档案
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        if (profiles && profiles.length > 0) {
          redirect(`/${lang}/dashboard`)
        } else {
          redirect(`/${lang}/onboarding`)
        }
      }
    }
  }

  redirect('/en/auth/error')
}
