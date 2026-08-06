import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 账本适配器：核心函数不直接连接具体Supabase实例，由调用方（apps/web）传入
 * 自己的client。以后中国版/国际版分成两个独立数据库实例时，调用方各自传入
 * 各自的client即可，这里的函数不用改。
 */
export type LedgerAdapter = SupabaseClient;

export type LedgerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export function ok<T>(data: T): LedgerResult<T> {
  return { success: true, data };
}

export function fail(code: string, error: string): LedgerResult<never> {
  return { success: false, error, code };
}

export type WalletTransactionType =
  | 'redeem'
  | 'ai_generation'
  | 'refund'
  | 'admin_grant'
  | 'topup'
  | 'voucher_partial_charge'
  | 'sponsor_coverage';

export type VipTransactionType =
  | 'redeem'
  | 'admin_grant'
  | 'admin_revoke'
  | 'voucher_full';

export type CoverageType = 'full' | 'percentage' | 'fixed_amount';

export type RewardType = 'wallet' | 'vip' | 'voucher';

export interface ServiceCoverageVoucher {
  id: string;
  user_id: string;
  service_type: string;
  coverage_type: CoverageType;
  coverage_value: number;
  remaining_uses: number;
  issuer_label: string | null;
  source_batch_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface RedemptionCodeBatch {
  id: string;
  code_prefix: string;
  reward_type: RewardType;
  reward_config: Record<string, unknown>;
  code_expires_at: string | null;
  total_count: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface WalletRewardConfig {
  amount: number;
}

export interface VipRewardConfig {
  days: number;
}

export interface VoucherRewardConfig {
  service_type: string;
  coverage_type: CoverageType;
  coverage_value: number;
  uses: number;
}
