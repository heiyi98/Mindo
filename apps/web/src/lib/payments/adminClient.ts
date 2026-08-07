import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createSupabasePaymentsRepository } from '@mindo/db/supabase';

const paymentsAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 支付/账本相关的表全部走service role（见CLAUDE.md"关键教训"：session client
// 读不到这类表）。全项目只有这一处创建真正的Supabase连接，支付模块的路由文件
// 一律用这个repository，不再拿到原始client。
export const paymentsRepository = createSupabasePaymentsRepository(paymentsAdminClient);
