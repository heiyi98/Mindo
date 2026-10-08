import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { createAccountRepository } from '@/lib/account/adminClient';
import { createLoginServerClient } from '@/lib/supabase/server';

// 注销 = 清空这个人在 Mindo 的全部数据并退出登录。
// 账号本身属于 Alethego（与 TaskApp 共用），Mindo 不删、也没有权限删；
// 之后再用同一个账号登录 Mindo，会被当作全新用户（ensure_current_user 重新建行）。
export async function DELETE(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (body.confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
  }

  const accountRepo = createAccountRepository(supabase);

  // 先删各业务表（RLS确保只能删自己的）
  await accountRepo.deleteAllUserData(user.id);

  // 再删 public.users 这一行——指向它的外键都是 CASCADE，
  // 上面没覆盖到的下游表（片语、私信等）也会随之清空
  const { error: deleteUserError } = await accountRepo.deleteMindoUser(user.id);

  if (deleteUserError) {
    console.error('Delete Mindo user error:', deleteUserError);
    return NextResponse.json({ error: deleteUserError.message }, { status: 500 });
  }

  // scope:'local' 只清掉本浏览器的 Mindo 会话，不影响这个账号在 TaskApp 的登录
  const login = await createLoginServerClient();
  await login.auth.signOut({ scope: 'local' });

  return NextResponse.json({ success: true });
}
