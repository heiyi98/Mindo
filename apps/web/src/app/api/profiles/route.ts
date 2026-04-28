import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 获取用户所有档案
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, birth_time, birth_place_name, is_self, created_at')
    .eq('user_id', user.id)
    .order('is_self', { ascending: false })
    .order('created_at', { ascending: true });

  return NextResponse.json({ profiles: profiles || [] });
}

// 新增档案
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { display_name, birth_date, birth_time, birth_lat, birth_lng, birth_place_name } = body;

  if (!display_name || !birth_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 检查VIP状态（免费用户只能有1个档案）
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id);

  const { data: userData } = await supabase
    .from('users')
    .select('vip_tier')
    .eq('id', user.id)
    .single();

  if (existingProfiles && existingProfiles.length >= 1 && userData?.vip_tier === 'free') {
    return NextResponse.json({ error: 'vip_required' }, { status: 403 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      display_name,
      birth_date,
      birth_time: birth_time || null,
      birth_lat: birth_lat || null,
      birth_lng: birth_lng || null,
      birth_place_name: birth_place_name || null,
      is_self: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile });
}
