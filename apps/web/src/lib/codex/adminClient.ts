import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createSupabaseCodexRepository } from '@mindo/db/supabase';

const codexAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// codex_* 全部表启用了RLS但不写policy（默认拒绝一切），前台公开读取和后台管理
// 写入统一走这个service role client，不给anon/authenticated角色任何直接权限，
// 见 supabase/migrations/20260813000000_codex_db_rebuild.sql 顶部注释和
// Mindo-内容库.md。全项目只有这一处创建真正的Supabase连接，codex相关的路由
// 文件和前台渲染一律用这个repository，不再拿到原始client。
export const codexRepository = createSupabaseCodexRepository(codexAdminClient);
