import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/requireAuth'
import { createAccountRepository } from '@/lib/account/adminClient'

export async function GET(req: NextRequest) {
  const { supabase, user } = await requireApiUser()
  if (!user) return NextResponse.json({ layout: null })

  const profileId = req.nextUrl.searchParams.get('profile_id')
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
  }

  const layout = await createAccountRepository(supabase).getDashboardLayout(profileId, user.id)

  return NextResponse.json({ layout })
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await requireApiUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile_id: profileId, layout } = await req.json()
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
  }

  const { error } = await createAccountRepository(supabase).updateDashboardLayout(profileId, user.id, layout)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
