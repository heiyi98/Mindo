import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBaziRepository } from '@mindo/db/supabase';

const baziAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 报告生成接口（有真实用户session）调用这个，读快照/档案走session client，
 * 写bazi_readings走service role。
 */
export function createBaziRepository(sessionClient: SupabaseClient) {
  return createSupabaseBaziRepository(sessionClient, baziAdminClient);
}

/**
 * reading-recovery这个cron调用这个——服务端到服务端触发，没有真实
 * session，全程用service role。
 */
export const baziRepositoryAdmin = createSupabaseBaziRepository(baziAdminClient, baziAdminClient);
