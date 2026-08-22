import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createSupabaseAdminRepository } from '@mindo/db/supabase';

const staffAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// public.admin 表启用了RLS但不写policy（默认拒绝一切），只有service role
// client能读写，见 supabase/migrations/20260813000000_codex_db_rebuild.sql
// 顶部说明。这是全站通用的后台人员身份表，不止服务内容库。
//
// 账号创建走 apps/web/scripts/create-admin-account.mjs（独立Node脚本，不经过
// Next.js进程，所以不复用这里的实例，自己单独建一个service role连接）。
export const adminAccountRepository = createSupabaseAdminRepository(staffAdminClient);
