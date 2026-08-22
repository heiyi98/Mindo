import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminAccount, AdminRepository, DbError } from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

// public.admin 启用了RLS但不写policy（默认拒绝一切），只有service role client
// 能读写，调用方必须传入service role连接，不能传session client。
export function createSupabaseAdminRepository(client: SupabaseClient): AdminRepository {
  return {
    async getByUserId(userId) {
      const { data, error } = await client
        .from('admin')
        .select('id, email, display_name, created_at, last_login_at')
        .eq('id', userId)
        .maybeSingle();
      if (error) return { data: null, error: toDbError(error) };
      return { data: data as AdminAccount | null, error: null };
    },
  } satisfies AdminRepository;
}
