import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createAccountRepository } from '@/lib/account/adminClient';

export async function DELETE(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (body.confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
  }

  const accountRepo = createAccountRepository(supabase);

  // 删除所有用户数据（RLS确保只能删自己的）
  await accountRepo.deleteAllUserData(user.id);

  // 真正删除 Auth 层身份——只有 service_role 权限的 admin API 能做这件事，
  // 普通客户端 SDK（包括下面的 supabase.auth.signOut()）完全没有能力删除
  // 一个 auth.users 记录，之前只调 signOut 是这个功能"删不干净"的根因。
  //
  // 放在业务表删除之后执行：这样即便这一步失败，至少业务数据已经清空，
  // 不会出现"auth身份没了、业务数据却还残留"这种更难排查的反向不一致。
  const { error: deleteAuthError } = await accountRepo.deleteAuthUser(user.id);

  if (deleteAuthError) {
    console.error('Delete auth user error:', deleteAuthError);
    return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
