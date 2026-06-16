import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateStarChart } from '@mindo/core';
import type { WesternFullModeInput, WesternDateModeInput } from '@mindo/core';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { profile_id } = body;

    if (!profile_id) {
      return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 });
    }

    // 验证档案属于该用户
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profile_id)
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 检查已有快照
    const { data: existing } = await supabase
      .from('astrology_snapshots')
      .select('id, calculation_result')
      .eq('profile_id', profile_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ result: existing.calculation_result, fromCache: true });
    }

    // 构建输入参数
    const birthDate = profile.birth_date as string;
    const [year, month, day] = birthDate.split('-').map(Number);

    // 从出生城市经纬度估算时区偏移（简化：用经度/15）
    const timezoneOffset = profile.birth_lng
      ? Math.round(profile.birth_lng / 15)
      : 0;

    let input: WesternFullModeInput | WesternDateModeInput;

    if (
      profile.birth_time &&
      profile.birth_lat !== null &&
      profile.birth_lng !== null
    ) {
      const [hour, minute] = (profile.birth_time as string).split(':').map(Number);
      input = {
        year, month, day,
        hour, minute,
        lat: profile.birth_lat,
        lng: profile.birth_lng,
        timezoneOffset,
      };
    } else {
      input = { year, month, day, timezoneOffset };
    }

    const result = calculateStarChart(input);

    // 存入快照
    const { data: selfProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .eq('is_self', true)
      .single();

    await supabase.from('astrology_snapshots').insert({
      profile_id,
      user_id: user.id,
      calculation_result: result,
      profile_display_name: profile.display_name ?? null,
      user_display_name: selfProfile?.display_name ?? null,
      user_handle: null,
    });

    return NextResponse.json({ result, fromCache: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Western astrology API error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
