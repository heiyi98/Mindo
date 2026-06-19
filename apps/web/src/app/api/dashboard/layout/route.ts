import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ layout: null })

  const { data } = await supabase
    .from('users')
    .select('dashboard_layout')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ layout: (data as any)?.dashboard_layout ?? null })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { layout } = await req.json()

  const { error } = await supabase
    .from('users')
    .update({ dashboard_layout: layout } as any)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
