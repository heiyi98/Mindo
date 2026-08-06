import { createClient } from '@/lib/supabase/server';

/**
 * /admin下所有API路由的权限判断：proxy.ts已经在中间件层挡过一次，
 * 这里再判断一次是双重保险，不依赖中间件matcher覆盖所有情况。
 */
export async function requireAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!user?.email || !adminEmails.includes(user.email)) {
    return null;
  }
  return user;
}
