import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

// 必须跟项目实际支持的语言列表一致（CLAUDE.md 里写的九种）
const SUPPORTED_LOCALES = ['zh', 'zh-Hant', 'en', 'fr', 'de', 'es', 'ja', 'ko', 'it']

function generateHandle(): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `mindo_${suffix}`
}

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitLocale = searchParams.get('locale')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 读取语言偏好 + handle。用 maybeSingle 而不是 single——
        // single 在查不到行时会把 error 静默丢在解构里不处理，
        // userData 直接变成 null，看起来跟"正常查到、只是字段是
        // null"没有区别，等于把"这一行压根不存在"这件事悄悄吞掉了。
        let { data: userData } = await supabase
          .from('users')
          .select('language_preference, handle')
          .eq('id', user.id)
          .maybeSingle()

        // 自愈：public.users 这一行本该在注册时由 handle_new_user
        // 这个触发器自动建好。如果这里读不到，说明这一行因为某种原因
        // 丢失了。补一份跟 handle_new_user 完全同样的最小版本
        // （只有 id + email），不影响正常注册时的行为。
        if (!userData) {
          await adminClient
            .from('users')
            .upsert(
              { id: user.id, email: user.email },
              { onConflict: 'id', ignoreDuplicates: true }
            )
          userData = { language_preference: null, handle: null } as any
        }

        // 语言优先级：登录那一刻用户正在用的界面语言（最直接、最不会猜错）
        // → 浏览器 Accept-Language（前两者都没有时的合理兜底）
        // → 数据库里存的偏好（历史遗留，几乎不会命中，留着兼容旧数据）
        // → 英文（最终兜底）
        const validExplicitLocale =
          explicitLocale && SUPPORTED_LOCALES.includes(explicitLocale) ? explicitLocale : null
        const browserLocale = pickLocaleFromAcceptLanguage(request.headers.get('accept-language'))

        const lang =
          validExplicitLocale ||
          browserLocale ||
          userData?.language_preference ||
          'en'

        // 顺手把这次解析出来的语言写回去，这样以后任何走不到这段
        // "带着当前语言登录"逻辑的路径（比如以后新增的登录方式），
        // 至少能读到上一次真实生效过的语言，而不是永远读到 null。
        if (!userData?.language_preference) {
          await adminClient
            .from('users')
            .update({ language_preference: lang })
            .eq('id', user.id)
        }

        // 如果没有 handle，自动生成唯一值
        if (!userData?.handle) {
          let handle = ''
          let isUnique = false

          while (!isUnique) {
            handle = generateHandle()
            const { data: existing } = await adminClient
              .from('users')
              .select('id')
              .eq('handle', handle)
              .maybeSingle()
            isUnique = !existing
          }

          await adminClient
            .from('users')
            .update({ handle })
            .eq('id', user.id)
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