// 支付系统的数据操作契约。业务逻辑（packages/payments）和路由文件只依赖这份
// 接口，不直接感知底下是Supabase还是别的什么数据库。

import type { DbError } from '../shared/types';
export type { DbError };

export type CoverageType = 'full' | 'percentage' | 'fixed_amount';
export type RewardType = 'wallet' | 'vip' | 'voucher';

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

export interface RedemptionCodeBatchSummary {
  id: string;
  code_prefix: string;
  reward_type: RewardType;
  reward_config: Record<string, unknown>;
  code_expires_at: string | null;
  total_count: number;
  note: string | null;
  created_at: string;
}

export interface RedeemedCodeRow {
  id: string;
  batch_id: string;
}

export interface RedemptionCodeDiagnostic {
  status: string;
  batch_id: string;
  code_expires_at: string | null;
}

export interface ConsumedVoucherRow {
  coverage_type: CoverageType;
  coverage_value: number;
  service_type: string;
}

export interface LegacyProduct {
  assessment_type: string;
  lemon_variant_id: string;
}

export interface ServicePriceRow {
  service_type: string;
  price: number;
  updated_at: string;
}

export interface RedemptionCodeRow {
  code: string;
  status: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

export interface WalletTopupTierPrice {
  tier_id: string;
  currency_code: string;
  price: number;
  updated_at: string;
}

export interface WalletTopupTier {
  id: string;
  wallet_amount: number;
  display_order: number;
  is_active: boolean;
  wallet_topup_tier_prices: WalletTopupTierPrice[];
}

export interface AdminUserLookup {
  id: string;
  email: string;
  handle: string | null;
  vip_expires_at: string | null;
}

export interface PaymentsRepository {
  // wallet.ts 底层
  deductWalletRaw(
    userId: string,
    amount: number,
    type: WalletTransactionType,
    referenceId: string | null,
    actorId: string | null
  ): Promise<{ data: number | null; error: DbError | null }>;

  creditWalletRaw(
    userId: string,
    amount: number,
    type: WalletTransactionType,
    referenceId: string | null,
    actorId: string | null
  ): Promise<{ data: number | null; error: DbError | null }>;

  // vip.ts 底层
  extendVipRaw(
    userId: string,
    days: number,
    type: VipTransactionType,
    actorId: string | null
  ): Promise<{ data: string | null; error: DbError | null }>;

  getUserVipExpiry(
    userId: string
  ): Promise<{ data: { vip_expires_at: string | null } | null; error: DbError | null }>;

  // vouchers.ts 底层
  listVouchers(
    userId: string,
    serviceType?: string
  ): Promise<{ data: ServiceCoverageVoucher[]; error: DbError | null }>;

  consumeVoucherRaw(
    voucherId: string,
    userId: string
  ): Promise<{ data: ConsumedVoucherRow | null; error: DbError | null }>;

  restoreVoucherUse(voucherId: string): Promise<void>;

  getServicePrice(
    serviceType: string
  ): Promise<{ data: { price: number } | null; error: DbError | null }>;

  getWalletBalance(userId: string): Promise<number>;

  insertSponsorTransaction(input: {
    userId: string;
    amount: number;
    balanceAfter: number;
    referenceId: string | null;
  }): Promise<void>;

  insertVoucher(input: {
    userId: string;
    serviceType: string;
    coverageType: CoverageType;
    coverageValue: number;
    remainingUses: number;
    issuerLabel: string | null;
    sourceBatchId: string | null;
    actorId: string | null;
  }): Promise<{ data: ServiceCoverageVoucher | null; error: DbError | null }>;

  // redemption.ts 底层
  redeemCodeRaw(
    code: string,
    userId: string
  ): Promise<{ data: RedeemedCodeRow | null; error: DbError | null }>;

  getRedemptionCodeDiagnostic(code: string): Promise<RedemptionCodeDiagnostic | null>;

  getBatchById(
    batchId: string
  ): Promise<{ data: RedemptionCodeBatchSummary | null; error: DbError | null }>;

  insertBatch(input: {
    codePrefix: string;
    rewardType: RewardType;
    rewardConfig: Record<string, unknown>;
    codeExpiresAt: string | null;
    totalCount: number;
    note: string | null;
    createdBy: string | null;
  }): Promise<{ data: { id: string } | null; error: DbError | null }>;

  insertCodes(batchId: string, codes: string[]): Promise<{ error: DbError | null }>;

  listBatches(): Promise<{ data: RedemptionCodeBatchSummary[]; error: DbError | null }>;

  countRedeemedCodes(batchId: string): Promise<number>;

  // checkout / webhook / admin/grant 路由直接用到的查询
  getActiveProduct(assessmentType: string): Promise<LegacyProduct | null>;
  getUserEmail(userId: string): Promise<string | null>;
  insertLegacyPurchase(input: {
    userId: string;
    snapshotType: string;
    amountCents: number;
    currency: string;
    providerOrderId: string;
  }): Promise<void>;
  findUserIdByHandle(handle: string): Promise<string | null>;

  // /admin 后台管理面板
  listUnusedCodesInBatch(batchId: string): Promise<{ data: { code: string }[]; error: DbError | null }>;
  getBatchDetail(
    batchId: string
  ): Promise<{ data: RedemptionCodeBatchSummary | null; error: DbError | null }>;
  listCodesInBatch(
    batchId: string
  ): Promise<{ data: RedemptionCodeRow[]; error: DbError | null }>;

  listServicePrices(): Promise<{ data: ServicePriceRow[]; error: DbError | null }>;
  upsertServicePrice(serviceType: string, price: number): Promise<{ error: DbError | null }>;

  listTopupTiers(): Promise<{ data: WalletTopupTier[]; error: DbError | null }>;
  insertTopupTier(
    walletAmount: number,
    displayOrder: number
  ): Promise<{ data: WalletTopupTier | null; error: DbError | null }>;
  updateTopupTier(
    tierId: string,
    update: { wallet_amount?: number; display_order?: number; is_active?: boolean }
  ): Promise<{ error: DbError | null }>;
  deleteTopupTier(tierId: string): Promise<{ error: DbError | null }>;
  upsertTierPrice(tierId: string, currencyCode: string, price: number): Promise<{ error: DbError | null }>;
  deleteTierPrice(tierId: string, currencyCode: string): Promise<{ error: DbError | null }>;

  findUserByEmail(email: string): Promise<{ data: AdminUserLookup | null; error: DbError | null }>;
  getWalletDetail(userId: string): Promise<{ balance: number; updated_at: string | null } | null>;
  listAllVouchersForAdmin(userId: string): Promise<ServiceCoverageVoucher[]>;
}
