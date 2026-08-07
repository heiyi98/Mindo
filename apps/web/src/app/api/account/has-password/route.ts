import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/requireAuth'
import { createAccountRepository } from '@/lib/account/adminClient'

export async function GET() {
  const { supabase, user } = await requireApiUser()
  if (!user) return NextResponse.json({ hasPassword: false })

  const hasPassword = await createAccountRepository(supabase).getAuthUserHasPassword(user.id)

  return NextResponse.json({ hasPassword })
}
