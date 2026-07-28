import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (body.confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
  }

  // 删除所有用户数据（RLS确保只能删自己的）
  await supabase.from('bazi_snapshots').delete().eq('user_id', user.id);
  await supabase.from('astrology_snapshots').delete().eq('user_id', user.id);
  await supabase.from('bigfive_assessments').delete().eq('user_id', user.id);
  await supabase.from('profiles').delete().eq('user_id', user.id);
  await supabase.from('subscriptions').delete().eq('user_id', user.id);
  await supabase.from('purchases').delete().eq('user_id', user.id);
  await supabase.from('users').delete().eq('id', user.id);

  // 真正删除 Auth 层身份——只有 service_role 权限的 admin API 能做这件事，
  // 普通客户端 SDK（包括这里的 supabase.auth.signOut()）完全没有能力删除
  // 一个 auth.users 记录，之前只调 signOut 是这个功能"删不干净"的根因。
  //
  // 放在业务表删除之后执行：这样即便这一步失败，至少业务数据已经清空，
  // 不会出现"auth身份没了、业务数据却还残留"这种更难排查的反向不一致。
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteAuthError) {
    console.error('Delete auth user error:', deleteAuthError);
    return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}