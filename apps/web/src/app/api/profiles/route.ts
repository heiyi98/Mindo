import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createAccountRepository } from '@/lib/account/adminClient';

export async function GET() {
  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profiles = await createAccountRepository(supabase).listProfiles(user.id);

  return NextResponse.json({ profiles });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { display_name, birth_date, birth_time, birth_lat, birth_lng, birth_place_name, birth_timezone, is_minute_unknown } = body;

  if (!display_name || !birth_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const accountRepo = createAccountRepository(supabase);
  const existingProfiles = await accountRepo.listProfiles(user.id);
  const isVip = await accountRepo.getUserVipActive(user.id);

  if (existingProfiles.length >= 1 && !isVip) {
    return NextResponse.json({ error: 'vip_required' }, { status: 403 });
  }

  // 新档案永远排在"其他档案"最后面：取现有非本人档案里 order_index 的最大值 +1，
  // 不依赖数据库列默认值——之前默认值大概率是0，导致新档案排到本人档案后面第一个，
  // 而不是最后一个，这次显式算好再插入，从根上解决排序错位。
  const maxOrderIndex = existingProfiles
    .filter(p => !p.is_self)
    .reduce((max, p) => Math.max(max, p.order_index ?? 0), 0);

  const { data: profile, error } = await accountRepo.createProfile({
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
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile });
}
