import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ layout: null })

  const profileId = req.nextUrl.searchParams.get('profile_id')
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
  }

  const { data } = await supabase
    .from('profiles')
    .select('dashboard_layout')
    .eq('id', profileId)
    .eq('user_id', user.id) // 显式校验这个档案属于当前登录用户，不单纯依赖RLS
    .maybeSingle() // 档案可能不存在/不属于自己，用maybeSingle避免.single()静默吞错误

  return NextResponse.json({ layout: (data as any)?.dashboard_layout ?? null })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profile_id: profileId, layout } = await req.json()
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ dashboard_layout: layout } as any)
    .eq('id', profileId)
    .eq('user_id', user.id) // 同上，显式校验归属，防止传别人的profile_id写入别人的档案

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}