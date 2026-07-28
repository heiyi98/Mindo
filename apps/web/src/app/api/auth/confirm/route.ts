import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function generateHandle(): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return `mindo_${suffix}`
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 自愈：确保 public.users 这一行存在。maybeSingle 而不是
        // single——避免"查不到行"这个情况被静默吞掉。
        let { data: userData } = await supabase
          .from('users')
          .select('handle')
          .eq('id', user.id)
          .maybeSingle()

        if (!userData) {
          await adminClient
            .from('users')
            .upsert(
              { id: user.id, email: user.email },
              { onConflict: 'id', ignoreDuplicates: true }
            )
          userData = { handle: null } as any
        }

        // 邮箱注册这条路径之前一直没有这段——补上，跟 Google 登录
        // 那条路径（callback/route.ts）保持一致
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
      }

      if (type === 'signup') {
        return NextResponse.redirect(`${origin}/auth/set-password`)
      }
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}