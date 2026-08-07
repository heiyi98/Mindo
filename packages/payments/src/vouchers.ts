import type { PaymentsRepository, LedgerResult, ServiceCoverageVoucher, CoverageType } from './types';
import { ok, fail } from './types';
import { deductWallet } from './wallet';
import { extendVip } from './vip';

/**
 * 查询用户在某个service_type上还能用的所有覆盖凭证（remaining_uses>0）。
 */
export async function listAvailableVouchers(
  repo: PaymentsRepository,
  userId: string,
  serviceType: string
): Promise<LedgerResult<ServiceCoverageVoucher[]>> {
  const { data, error } = await repo.listVouchers(userId, serviceType);

  if (error) return fail('db_error', error.message);

  return ok(data);
}

export interface ConsumeVoucherResult {
  coverageType: CoverageType;
  selfPayAmount: number;
  vipExpiresAt?: string;
}

/**
 * 核销一张服务覆盖凭证。先原子递减remaining_uses（consume_voucher数据库函数），
 * 成功后再按service_type+coverage_type分流处理。分流步骤失败时（比如自付部分
 * 余额不够）会调用restore_voucher_use把这次使用次数补偿回去。
 */
export async function consumeVoucher(
  repo: PaymentsRepository,
  voucherId: string,
  userId: string,
  referenceId?: string
): Promise<LedgerResult<ConsumeVoucherResult>> {
  const { data: consumed, error: consumeError } = await repo.consumeVoucherRaw(voucherId, userId);

  if (consumeError) return fail('db_error', consumeError.message);
  if (!consumed) return fail('voucher_unavailable', '凭证不存在或已用完');

  const { coverage_type: coverageType, coverage_value: coverageValue, service_type: serviceType } = consumed;

  if (serviceType === 'vip_subscription') {
    if (coverageType !== 'full') {
      await repo.restoreVoucherUse(voucherId);
      return fail('unsupported_combination', 'VIP订阅只支持全免类型的凭证');
    }

    const vipResult = await extendVip(repo, userId, coverageValue, 'voucher_full');
    if (!vipResult.success) {
      await repo.restoreVoucherUse(voucherId);
      return fail(vipResult.code, vipResult.error);
    }

    return ok({ coverageType, selfPayAmount: 0, vipExpiresAt: vipResult.data.expiresAt });
  }

  if (coverageType === 'full') {
    return ok({ coverageType, selfPayAmount: 0 });
  }

  const { data: priceRow, error: priceError } = await repo.getServicePrice(serviceType);

  if (priceError || !priceRow) {
    await repo.restoreVoucherUse(voucherId);
    return fail('price_not_found', '找不到该服务的价目');
  }

  const basePrice = priceRow.price;
  const selfPayAmount =
    coverageType === 'percentage'
      ? Math.max(0, Math.round(basePrice * (1 - coverageValue / 100)))
      : Math.max(0, basePrice - coverageValue);

  let balanceAfter: number;

  if (selfPayAmount > 0) {
    const deductResult = await deductWallet(repo, userId, selfPayAmount, 'voucher_partial_charge', {
      referenceId,
    });
    if (!deductResult.success) {
      await repo.restoreVoucherUse(voucherId);
      return fail(deductResult.code, deductResult.error);
    }
    balanceAfter = deductResult.data.balance;
  } else {
    balanceAfter = await repo.getWalletBalance(userId);
  }

  // 对账留痕：这部分是发行方（issuer_label）承担的金额，不实际影响任何人的余额
  await repo.insertSponsorTransaction({
    userId,
    amount: basePrice - selfPayAmount,
    balanceAfter,
    referenceId: referenceId ?? null,
  });

  return ok({ coverageType, selfPayAmount });
}

export interface GrantVoucherInput {
  userId: string;
  serviceType: string;
  coverageType: CoverageType;
  coverageValue: number;
  remainingUses?: number;
  issuerLabel?: string;
  sourceBatchId?: string;
  actorId?: string;
}

/**
 * 直接发放一张服务覆盖凭证（管理员发放、或兑换码核销voucher类型时调用）。
 */
export async function grantVoucher(
  repo: PaymentsRepository,
  input: GrantVoucherInput
): Promise<LedgerResult<ServiceCoverageVoucher>> {
  const { data, error } = await repo.insertVoucher({
    userId: input.userId,
    serviceType: input.serviceType,
    coverageType: input.coverageType,
    coverageValue: input.coverageValue,
    remainingUses: input.remainingUses ?? 1,
    issuerLabel: input.issuerLabel ?? null,
    sourceBatchId: input.sourceBatchId ?? null,
    actorId: input.actorId ?? null,
  });

  if (error) return fail('db_error', error.message);

  return ok(data as ServiceCoverageVoucher);
}
