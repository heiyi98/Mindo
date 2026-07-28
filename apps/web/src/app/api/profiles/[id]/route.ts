import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: any = {};
  if (body.display_name !== undefined) updates.display_name = body.display_name;
  if (body.birth_date !== undefined) updates.birth_date = body.birth_date;
  if (body.birth_time !== undefined) updates.birth_time = body.birth_time || null;
  if (body.birth_lat !== undefined) updates.birth_lat = body.birth_lat || null;
  if (body.birth_lng !== undefined) updates.birth_lng = body.birth_lng || null;
  if (body.birth_place_name !== undefined) updates.birth_place_name = body.birth_place_name || null;
  if (body.birth_timezone !== undefined) updates.birth_timezone = body.birth_timezone || null;
  if (body.gender !== undefined) updates.gender = body.gender ?? null;
  if (body.order_index !== undefined) updates.order_index = body.order_index;
  if (body.is_minute_unknown !== undefined) updates.is_minute_unknown = body.is_minute_unknown;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.birth_date !== undefined || body.birth_time !== undefined || body.birth_lat !== undefined) {
    await Promise.all([
      supabase.from('bazi_snapshots').delete().eq('profile_id', id),
      supabase.from('astrology_snapshots').delete().eq('profile_id', id),
      supabase.from('life_timeline').delete().eq('profile_id', id),
    ]);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, user_id, is_self')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.is_self) return NextResponse.json({ error: 'Cannot delete primary profile' }, { status: 400 });

  await supabase.from('profiles').delete().eq('id', id);
  return NextResponse.json({ success: true });
}