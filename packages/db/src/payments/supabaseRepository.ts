import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminUserLookup,
  ConsumedVoucherRow,
  CoverageType,
  DbError,
  LegacyProduct,
  PaymentsRepository,
  ProTransactionType,
  RedeemedCodeRow,
  RedemptionCodeBatchSummary,
  RedemptionCodeDiagnostic,
  RedemptionCodeRow,
  RewardType,
  ServiceCoverageVoucher,
  ServicePriceRow,
  VipTransactionType,
  WalletTopupTier,
  WalletTransactionType,
} from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

export function createSupabasePaymentsRepository(client: SupabaseClient): PaymentsRepository {
  return {
    async deductWalletRaw(userId, amount, type, referenceId, actorId) {
      const { data, error } = await client.rpc('deduct_wallet', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_reference_id: referenceId,
        p_actor_id: actorId,
      });
      return { data: data as number | null, error: toDbError(error) };
    },

    async creditWalletRaw(userId, amount, type, referenceId, actorId) {
      const { data, error } = await client.rpc('credit_wallet', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_reference_id: referenceId,
        p_actor_id: actorId,
      });
      return { data: data as number | null, error: toDbError(error) };
    },

    async extendVipRaw(userId, days, type, actorId) {
      const { data, error } = await client.rpc('extend_vip', {
        p_user_id: userId,
        p_days: days,
        p_type: type,
        p_actor_id: actorId,
      });
      return { data: data as string | null, error: toDbError(error) };
    },

    async getUserVipExpiry(userId) {
      const { data, error } = await client
        .from('users')
        .select('vip_expires_at')
        .eq('id', userId)
        .maybeSingle();
      return { data: data as { vip_expires_at: string | null } | null, error: toDbError(error) };
    },

    async extendProRaw(userId, days, type, actorId) {
      const { data, error } = await client.rpc('extend_pro', {
        p_user_id: userId,
        p_days: days,
        p_type: type,
        p_actor_id: actorId,
      });
      return { data: data as string | null, error: toDbError(error) };
    },

    async getUserProExpiry(userId) {
      const { data, error } = await client
        .from('users')
        .select('pro_expires_at')
        .eq('id', userId)
        .maybeSingle();
      return { data: data as { pro_expires_at: string | null } | null, error: toDbError(error) };
    },

    async listVouchers(userId, serviceType) {
      let query = client
        .from('service_coverage_vouchers')
        .select('*')
        .eq('user_id', userId)
        .gt('remaining_uses', 0)
        .order('created_at', { ascending: true });

      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }

      const { data, error } = await query;
      return { data: (data ?? []) as ServiceCoverageVoucher[], error: toDbError(error) };
    },

    async consumeVoucherRaw(voucherId, userId) {
      const { data, error } = await client
        .rpc('consume_voucher', { p_voucher_id: voucherId, p_user_id: userId })
        .maybeSingle();
      return { data: data as ConsumedVoucherRow | null, error: toDbError(error) };
    },

    async restoreVoucherUse(voucherId) {
      await client.rpc('restore_voucher_use', { p_voucher_id: voucherId });
    },

    async getServicePrice(serviceType) {
      const { data, error } = await client
        .from('service_prices')
        .select('price')
        .eq('service_type', serviceType)
        .maybeSingle();
      return { data: data as { price: number } | null, error: toDbError(error) };
    },

    async getWalletBalance(userId) {
      const { data } = await client
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      return (data?.balance as number | undefined) ?? 0;
    },

    async insertSponsorTransaction(input) {
      await client.from('wallet_transactions').insert({
        user_id: input.userId,
        amount: input.amount,
        balance_after: input.balanceAfter,
        type: 'sponsor_coverage',
        reference_id: input.referenceId,
      });
    },

    async insertVoucher(input) {
      const { data, error } = await client
        .from('service_coverage_vouchers')
        .insert({
          user_id: input.userId,
          service_type: input.serviceType,
          coverage_type: input.coverageType,
          coverage_value: input.coverageValue,
          remaining_uses: input.remainingUses,
          issuer_label: input.issuerLabel,
          source_batch_id: input.sourceBatchId,
          actor_id: input.actorId,
        })
        .select('*')
        .single();
      return { data: data as ServiceCoverageVoucher | null, error: toDbError(error) };
    },

    async redeemCodeRaw(code, userId) {
      const { data, error } = await client
        .rpc('redeem_code', { p_code: code, p_user_id: userId })
        .maybeSingle();
      return { data: data as RedeemedCodeRow | null, error: toDbError(error) };
    },

    async getRedemptionCodeDiagnostic(code) {
      const { data } = await client
        .from('redemption_codes')
        .select('status, batch_id, redemption_code_batches(code_expires_at)')
        .eq('code', code)
        .maybeSingle();

      if (!data) return null;

      const batch = data.redemption_code_batches as unknown as { code_expires_at: string | null } | null;
      return {
        status: data.status as string,
        batch_id: data.batch_id as string,
        code_expires_at: batch?.code_expires_at ?? null,
      } satisfies RedemptionCodeDiagnostic;
    },

    async getBatchById(batchId) {
      const { data, error } = await client
        .from('redemption_code_batches')
        .select('id, code_prefix, reward_type, reward_config, code_expires_at, total_count, note, created_at')
        .eq('id', batchId)
        .single();
      return { data: data as RedemptionCodeBatchSummary | null, error: toDbError(error) };
    },

    async insertBatch(input) {
      const { data, error } = await client
        .from('redemption_code_batches')
        .insert({
          code_prefix: input.codePrefix,
          reward_type: input.rewardType,
          reward_config: input.rewardConfig,
          code_expires_at: input.codeExpiresAt,
          total_count: input.totalCount,
          note: input.note,
          created_by: input.createdBy,
        })
        .select('id')
        .single();
      return { data: data as { id: string } | null, error: toDbError(error) };
    },

    async insertCodes(batchId, codes) {
      const { error } = await client
        .from('redemption_codes')
        .insert(codes.map((code) => ({ batch_id: batchId, code })));
      return { error: toDbError(error) };
    },

    async listBatches() {
      const { data, error } = await client
        .from('redemption_code_batches')
        .select('id, code_prefix, reward_type, reward_config, code_expires_at, total_count, note, created_at')
        .order('created_at', { ascending: false });
      return { data: (data ?? []) as RedemptionCodeBatchSummary[], error: toDbError(error) };
    },

    async countRedeemedCodes(batchId) {
      const { count } = await client
        .from('redemption_codes')
        .select('id', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .eq('status', 'redeemed');
      return count ?? 0;
    },

    async getActiveProduct(assessmentType) {
      const { data } = await client
        .from('products')
        .select('*')
        .eq('assessment_type', assessmentType)
        .eq('is_active', true)
        .single();
      return (data as LegacyProduct | null) ?? null;
    },

    async getUserEmail(userId) {
      const { data } = await client.from('users').select('email').eq('id', userId).single();
      return (data?.email as string | undefined) ?? null;
    },

    async insertLegacyPurchase(input) {
      await client.from('purchases').insert({
        user_id: input.userId,
        snapshot_type: input.snapshotType,
        amount_cents: input.amountCents,
        currency: input.currency,
        provider: 'lemonsqueezy',
        provider_order_id: input.providerOrderId,
        status: 'completed',
      });
    },

    async findUserIdByHandle(handle) {
      const { data } = await client.from('users').select('id').eq('handle', handle).maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },

    async listUnusedCodesInBatch(batchId) {
      const { data, error } = await client
        .from('redemption_codes')
        .select('code')
        .eq('batch_id', batchId)
        .eq('status', 'unused')
        .order('code', { ascending: true });
      return { data: (data ?? []) as { code: string }[], error: toDbError(error) };
    },

    async getBatchDetail(batchId) {
      const { data, error } = await client
        .from('redemption_code_batches')
        .select('*')
        .eq('id', batchId)
        .single();
      return { data: data as RedemptionCodeBatchSummary | null, error: toDbError(error) };
    },

    async listCodesInBatch(batchId) {
      const { data, error } = await client
        .from('redemption_codes')
        .select('code, status, redeemed_by, redeemed_at')
        .eq('batch_id', batchId)
        .order('code', { ascending: true });
      return { data: (data ?? []) as RedemptionCodeRow[], error: toDbError(error) };
    },

    async listServicePrices() {
      const { data, error } = await client
        .from('service_prices')
        .select('*')
        .order('service_type', { ascending: true });
      return { data: (data ?? []) as ServicePriceRow[], error: toDbError(error) };
    },

    async upsertServicePrice(serviceType, price) {
      const { error } = await client
        .from('service_prices')
        .upsert({ service_type: serviceType, price, updated_at: new Date().toISOString() });
      return { error: toDbError(error) };
    },

    async listTopupTiers() {
      const { data, error } = await client
        .from('wallet_topup_tiers')
        .select('*, wallet_topup_tier_prices(*)')
        .order('display_order', { ascending: true });
      return { data: (data ?? []) as unknown as WalletTopupTier[], error: toDbError(error) };
    },

    async insertTopupTier(walletAmount, displayOrder) {
      const { data, error } = await client
        .from('wallet_topup_tiers')
        .insert({ wallet_amount: walletAmount, display_order: displayOrder })
        .select('*')
        .single();
      return { data: data as unknown as WalletTopupTier | null, error: toDbError(error) };
    },

    async updateTopupTier(tierId, update) {
      const { error } = await client.from('wallet_topup_tiers').update(update).eq('id', tierId);
      return { error: toDbError(error) };
    },

    async deleteTopupTier(tierId) {
      const { error } = await client.from('wallet_topup_tiers').delete().eq('id', tierId);
      return { error: toDbError(error) };
    },

    async upsertTierPrice(tierId, currencyCode, price) {
      const { error } = await client.from('wallet_topup_tier_prices').upsert({
        tier_id: tierId,
        currency_code: currencyCode,
        price,
        updated_at: new Date().toISOString(),
      });
      return { error: toDbError(error) };
    },

    async deleteTierPrice(tierId, currencyCode) {
      const { error } = await client
        .from('wallet_topup_tier_prices')
        .delete()
        .eq('tier_id', tierId)
        .eq('currency_code', currencyCode);
      return { error: toDbError(error) };
    },

    async findUserByEmail(email) {
      const { data, error } = await client
        .from('users')
        .select('id, email, handle, vip_expires_at, pro_expires_at')
        .eq('email', email)
        .maybeSingle();
      return { data: data as AdminUserLookup | null, error: toDbError(error) };
    },

    async getWalletDetail(userId) {
      const { data } = await client
        .from('wallets')
        .select('balance, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (!data) return null;
      return { balance: data.balance as number, updated_at: (data.updated_at as string | null) ?? null };
    },

    async listAllVouchersForAdmin(userId) {
      const { data } = await client
        .from('service_coverage_vouchers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return (data ?? []) as ServiceCoverageVoucher[];
    },
  };
}

export type { CoverageType, RewardType };
