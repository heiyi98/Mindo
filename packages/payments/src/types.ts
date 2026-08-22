export type {
  CoverageType,
  RewardType,
  WalletTransactionType,
  VipTransactionType,
  ProTransactionType,
  ServiceCoverageVoucher,
  RedemptionCodeBatchSummary as RedemptionCodeBatch,
  PaymentsRepository,
} from '@mindo/db';

export type LedgerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

export function ok<T>(data: T): LedgerResult<T> {
  return { success: true, data };
}

export function fail(code: string, error: string): LedgerResult<never> {
  return { success: false, error, code };
}

export interface WalletRewardConfig {
  amount: number;
}

export interface VipRewardConfig {
  days: number;
}

export interface ProRewardConfig {
  days: number;
}

export interface VoucherRewardConfig {
  service_type: string;
  coverage_type: import('@mindo/db').CoverageType;
  coverage_value: number;
  uses: number;
}
