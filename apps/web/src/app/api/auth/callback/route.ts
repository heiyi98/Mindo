import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function generateHandle(): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `mindo_${suffix}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // 读取语言偏好 + handle
        const { data: userData } = await supabase
          .from('users')
          .select('language_preference, handle')
          .eq('id', user.id)
          .single()

        const lang = userData?.language_preference || 'en'

        // 如果没有 handle，自动生成唯一值
        if (!userData?.handle) {
          const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )

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