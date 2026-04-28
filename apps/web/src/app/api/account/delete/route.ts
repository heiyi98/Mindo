import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (body.confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
  }

  // 删除所有用户数据（RLS确保只能删自己的）
  await supabase.from('snapshots').delete().eq('user_id', user.id);
  await supabase.from('profiles').delete().eq('user_id', user.id);
  await supabase.from('subscriptions').delete().eq('user_id', user.id);
  await supabase.from('purchases').delete().eq('user_id', user.id);
  await supabase.from('users').delete().eq('id', user.id);

  // 登出
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
