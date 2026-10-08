import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAccountRepository } from '@mindo/db/supabase';

const accountAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * sessionClient由每个路由自己的requireApiUser()传入（尊重RLS，操作范围
 * 天然限定在当前登录用户名下）。内部固定复用同一个service role admin
 * client，只在deleteMindoUser（注销时删 public.users 这一行，users 表
 * 没给 authenticated 开 delete 权限）这一处用到。
 */
export function createAccountRepository(sessionClient: SupabaseClient) {
  return createSupabaseAccountRepository(sessionClient, accountAdminClient);
}
