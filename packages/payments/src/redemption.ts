import { randomInt } from 'crypto';
import type { LedgerAdapter, LedgerResult, RewardType } from './types';
import { ok, fail } from './types';
import { creditWallet } from './wallet';
import { extendVip } from './vip';
import { grantVoucher } from './vouchers';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCodeSuffix(length = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return result;
}

export interface RedeemCodeResult {
  rewardType: RewardType;
  walletBalance?: number;
  vipExpiresAt?: string;
  voucherId?: string;
}

/**
 * 兑换码核销。先原子UPDATE redemption_codes（redeem_code数据库函数），
 * 0行返回时再做一次诊断查询区分"码不存在"/"已核销"/"批次已过期"，
 * 分别给前端不同的错误提示。核销成功后按批次的reward_type分流入账。
 */
export async function redeemCode(
  client: LedgerAdapter,
  code: string,
  userId: string
): Promise<LedgerResult<RedeemCodeResult>> {
  const { data: redeemed, error: redeemError } = await client
    .rpc('redeem_code', { p_code: code, p_user_id: userId })
    .maybeSingle();

  if (redeemError) return fail('db_error', redeemError.message);

  if (!redeemed) {
    const { data: existing } = await client
      .from('redemption_codes')
      .select('status, batch_id, redemption_code_batches(code_expires_at)')
      .eq('code', code)
      .maybeSingle();

    if (!existing) return fail('code_not_found', '兑换码不存在');
    if (existing.status === 'redeemed') return fail('already_redeemed', '这张兑换码已经被使用过了');

    const batch = existing.redemption_code_batches as unknown as { code_expires_at: string | null } | null;
    if (batch?.code_expires_at && new Date(batch.code_expires_at).getTime() <= Date.now()) {
      return fail('code_expired', '这张兑换码已经过期');
    }

    return fail('code_not_found', '兑换码不存在');
  }

  const { id: redemptionCodeId, batch_id: batchId } = redeemed as { id: string; batch_id: string };

  const { data: batch, error: batchError } = await client
    .from('redemption_code_batches')
    .select('reward_type, reward_config, code_prefix')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) return fail('db_error', batchError?.message ?? '批次不存在');

  const rewardType = batch.reward_type as RewardType;
  const config = batch.reward_config as Record<string, any>;

  if (rewardType === 'wallet') {
    const result = await creditWallet(client, userId, config.amount, 'redeem', {
      referenceId: redemptionCodeId,
    });
    if (!result.success) return fail(result.code, result.error);
    return ok({ rewardType, walletBalance: result.data.balance });
  }

  if (rewardType === 'vip') {
    const result = await extendVip(client, userId, config.days, 'redeem');
    if (!result.success) return fail(result.code, result.error);
    return ok({ rewardType, vipExpiresAt: result.data.expiresAt });
  }

  // voucher
  const result = await grantVoucher(client, {
    userId,
    serviceType: config.service_type,
    coverageType: config.coverage_type,
    coverageValue: config.coverage_value,
    remainingUses: config.uses ?? 1,
    issuerLabel: batch.code_prefix,
    sourceBatchId: batchId,
  });
  if (!result.success) return fail(result.code, result.error);
  return ok({ rewardType, voucherId: result.data.id });
}

export interface CreateBatchInput {
  codePrefix?: string;
  rewardType: RewardType;
  rewardConfig: Record<string, unknown>;
  codeExpiresAt?: string;
  totalCount: number;
  note?: string;
  createdBy?: string;
}

export interface CreateBatchResult {
  batchId: string;
  codes: string[];
}

/**
 * 生成一批兑换码。code格式为"{前缀}-{8位随机大写字母数字}"，遇到唯一性冲突时
 * 整批重新生成候选码重试（冲突概率极低，不做逐条局部重试的复杂化处理）。
 */
export async function createBatch(
  client: LedgerAdapter,
  input: CreateBatchInput
): Promise<LedgerResult<CreateBatchResult>> {
  const codePrefix = input.codePrefix?.trim() ?? '';

  const { data: batch, error: batchError } = await client
    .from('redemption_code_batches')
    .insert({
      code_prefix: codePrefix,
      reward_type: input.rewardType,
      reward_config: input.rewardConfig,
      code_expires_at: input.codeExpiresAt ?? null,
      total_count: input.totalCount,
      note: input.note ?? null,
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single();

  if (batchError || !batch) return fail('db_error', batchError?.message ?? '创建批次失败');

  const batchId = batch.id as string;
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const codes = Array.from(
      new Set(
        Array.from(
          { length: input.totalCount },
          () => (codePrefix ? `${codePrefix}-${generateCodeSuffix()}` : generateCodeSuffix())
        )
      )
    );

    // 极小概率同批次内部生成了重复码，凑不够数量时直接进入下一次整批重试
    if (codes.length !== input.totalCount) continue;

    const { error: insertError } = await client
      .from('redemption_codes')
      .insert(codes.map((code) => ({ batch_id: batchId, code })));

    if (!insertError) {
      return ok({ batchId, codes });
    }

    // 23505 = unique_violation，说明跟其他批次的码撞车了，整批重新生成再试
    if ((insertError as { code?: string }).code !== '23505') {
      return fail('db_error', insertError.message);
    }
  }

  return fail('code_generation_failed', '兑换码生成多次冲突，请重试');
}
