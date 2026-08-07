import { randomInt } from 'crypto';
import type { PaymentsRepository, LedgerResult, RewardType } from './types';
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
  repo: PaymentsRepository,
  code: string,
  userId: string
): Promise<LedgerResult<RedeemCodeResult>> {
  const { data: redeemed, error: redeemError } = await repo.redeemCodeRaw(code, userId);

  if (redeemError) return fail('db_error', redeemError.message);

  if (!redeemed) {
    const diagnostic = await repo.getRedemptionCodeDiagnostic(code);

    if (!diagnostic) return fail('code_not_found', '兑换码不存在');
    if (diagnostic.status === 'redeemed') return fail('already_redeemed', '这张兑换码已经被使用过了');

    if (diagnostic.code_expires_at && new Date(diagnostic.code_expires_at).getTime() <= Date.now()) {
      return fail('code_expired', '这张兑换码已经过期');
    }

    return fail('code_not_found', '兑换码不存在');
  }

  const { id: redemptionCodeId, batch_id: batchId } = redeemed;

  const { data: batch, error: batchError } = await repo.getBatchById(batchId);

  if (batchError || !batch) return fail('db_error', batchError?.message ?? '批次不存在');

  const rewardType = batch.reward_type;
  const config = batch.reward_config as Record<string, any>;

  if (rewardType === 'wallet') {
    const result = await creditWallet(repo, userId, config.amount, 'redeem', {
      referenceId: redemptionCodeId,
    });
    if (!result.success) return fail(result.code, result.error);
    return ok({ rewardType, walletBalance: result.data.balance });
  }

  if (rewardType === 'vip') {
    const result = await extendVip(repo, userId, config.days, 'redeem');
    if (!result.success) return fail(result.code, result.error);
    return ok({ rewardType, vipExpiresAt: result.data.expiresAt });
  }

  // voucher
  const result = await grantVoucher(repo, {
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
  repo: PaymentsRepository,
  input: CreateBatchInput
): Promise<LedgerResult<CreateBatchResult>> {
  const codePrefix = input.codePrefix?.trim() ?? '';

  const { data: batch, error: batchError } = await repo.insertBatch({
    codePrefix,
    rewardType: input.rewardType,
    rewardConfig: input.rewardConfig,
    codeExpiresAt: input.codeExpiresAt ?? null,
    totalCount: input.totalCount,
    note: input.note ?? null,
    createdBy: input.createdBy ?? null,
  });

  if (batchError || !batch) return fail('db_error', batchError?.message ?? '创建批次失败');

  const batchId = batch.id;
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

    const { error: insertError } = await repo.insertCodes(batchId, codes);

    if (!insertError) {
      return ok({ batchId, codes });
    }

    // 23505 = unique_violation，说明跟其他批次的码撞车了，整批重新生成再试
    if (insertError.code !== '23505') {
      return fail('db_error', insertError.message);
    }
  }

  return fail('code_generation_failed', '兑换码生成多次冲突，请重试');
}

export interface BatchSummary {
  id: string;
  code_prefix: string;
  reward_type: RewardType;
  reward_config: Record<string, unknown>;
  code_expires_at: string | null;
  total_count: number;
  note: string | null;
  created_at: string;
  redeemedCount: number;
}

/**
 * 后台管理面板用：列出全部兑换码批次，附带每批已核销数量。
 */
export async function listBatchesWithCounts(repo: PaymentsRepository): Promise<LedgerResult<BatchSummary[]>> {
  const { data: batches, error } = await repo.listBatches();

  if (error) return fail('db_error', error.message);

  const withCounts = await Promise.all(
    batches.map(async (batch) => ({
      ...batch,
      redeemedCount: await repo.countRedeemedCodes(batch.id),
    }))
  );

  return ok(withCounts);
}
