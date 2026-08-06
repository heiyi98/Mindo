import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, birth_time, birth_place_name, birth_lat, birth_lng, birth_timezone, gender, is_self, created_at, order_index, is_minute_unknown')
    .eq('user_id', user.id)
    .order('is_self', { ascending: false })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  return NextResponse.json({ profiles: profiles || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { display_name, birth_date, birth_time, birth_lat, birth_lng, birth_place_name, birth_timezone, is_minute_unknown } = body;

  if (!display_name || !birth_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, order_index, is_self')
    .eq('user_id', user.id);

  const { data: userData } = await supabase
    .from('users')
    .select('vip_expires_at')
    .eq('id', user.id)
    .single();

  const isVip = !!userData?.vip_expires_at && new Date(userData.vip_expires_at).getTime() > Date.now();

  if (existingProfiles && existingProfiles.length >= 1 && !isVip) {
    return NextResponse.json({ error: 'vip_required' }, { status: 403 });
  }

  // 新档案永远排在"其他档案"最后面：取现有非本人档案里 order_index 的最大值 +1，
  // 不依赖数据库列默认值——之前默认值大概率是0，导致新档案排到本人档案后面第一个，
  // 而不是最后一个，这次显式算好再插入，从根上解决排序错位。
  const maxOrderIndex = (existingProfiles || [])
    .filter(p => !p.is_self)
    .reduce((max, p) => Math.max(max, p.order_index ?? 0), 0);

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
      birth_timezone: birth_timezone || null,
      is_self: false,
      is_minute_unknown: is_minute_unknown ?? false,
      order_index: maxOrderIndex + 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile });
}