import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // 检查是否有档案
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        // 读取语言偏好
        const { data: userData } = await supabase
          .from('users')
          .select('language_preference')
          .eq('id', user.id)
          .single()

        const lang = userData?.language_preference || 'en'

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
