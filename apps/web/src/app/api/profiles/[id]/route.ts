import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 更新档案
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { display_name, birth_date, birth_time, birth_lat, birth_lng, birth_place_name } = body;

  // 确认档案属于该用户
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 删除免费快照，保留付费快照
  await supabase
    .from('snapshots')
    .delete()
    .eq('profile_id', id)
    .is('ai_reading', null);

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name,
      birth_date,
      birth_time: birth_time || null,
      birth_lat: birth_lat || null,
      birth_lng: birth_lng || null,
      birth_place_name: birth_place_name || null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// 删除档案
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // 不允许删除is_self=true的主档案
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
