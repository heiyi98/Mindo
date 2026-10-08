import { getVerifiedSession } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { User } from '@supabase/supabase-js';

/**
 * API路由专用的登录态检查。之前66个route.ts文件各自复制"建client+
 * getUser()"这两行，这里统一收口成一次调用。返回的supabase是带着当前
 * 用户Alethego令牌的Mindo数据client（尊重RLS，auth.uid() = Alethego用户编号），
 * 后续该文件自己的业务查询继续用它，这里只收口"谁是当前登录用户"这一步，
 * 不代管每个路由自己的数据库操作。
 *
 * 用户身份来自 Alethego 签发的令牌（Mindo 只验证、不签发），验证细节见
 * lib/supabase/server.ts 的 getVerifiedSession()。后台管理员不走这里，
 * 见 lib/admin/requireStaffAccount.ts。
 */
export async function requireApiUser() {
  const { supabase, user } = await getVerifiedSession();
  return { supabase, user: user as User | null };
}

export async function requireAuth(locale: string) {
  const { user } = await getVerifiedSession();

  if (!user) {
    redirect({ href: '/', locale });
  }

  return user!;
}

export async function requireProfile(locale: string) {
  const { supabase, user } = await getVerifiedSession();

  if (!user) {
    redirect({ href: '/', locale });
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, is_self')
    .eq('user_id', user!.id)
    .eq('is_self', true)
    .order('created_at', { ascending: true })
    .limit(1);

  const profile = profiles?.[0] || null;

  if (!profile) {
    redirect({ href: '/onboarding', locale });
  }

  return { user: user!, profile };
}
