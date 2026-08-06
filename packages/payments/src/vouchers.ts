import type {
  LedgerAdapter,
  LedgerResult,
  ServiceCoverageVoucher,
  CoverageType,
} from './types';
import { ok, fail } from './types';
import { deductWallet } from './wallet';
import { extendVip } from './vip';

/**
 * 查询用户在某个service_type上还能用的所有覆盖凭证（remaining_uses>0）。
 */
export async function listAvailableVouchers(
  client: LedgerAdapter,
  userId: string,
  serviceType: string
): Promise<LedgerResult<ServiceCoverageVoucher[]>> {
  const { data, error } = await client
    .from('service_coverage_vouchers')
    .select('*')
    .eq('user_id', userId)
    .eq('service_type', serviceType)
    .gt('remaining_uses', 0)
    .order('created_at', { ascending: true });

  if (error) return fail('db_error', error.message);

  return ok((data ?? []) as ServiceCoverageVoucher[]);
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
  client: LedgerAdapter,
  voucherId: string,
  userId: string,
  referenceId?: string
): Promise<LedgerResult<ConsumeVoucherResult>> {
  const { data: consumed, error: consumeError } = await client
    .rpc('consume_voucher', { p_voucher_id: voucherId, p_user_id: userId })
    .maybeSingle();

  if (consumeError) return fail('db_error', consumeError.message);
  if (!consumed) return fail('voucher_unavailable', '凭证不存在或已用完');

  const { coverage_type: coverageType, coverage_value: coverageValue, service_type: serviceType } =
    consumed as {
      coverage_type: CoverageType;
      coverage_value: number;
      service_type: string;
    };

  if (serviceType === 'vip_subscription') {
    if (coverageType !== 'full') {
      await client.rpc('restore_voucher_use', { p_voucher_id: voucherId });
      return fail('unsupported_combination', 'VIP订阅只支持全免类型的凭证');
    }

    const vipResult = await extendVip(client, userId, coverageValue, 'voucher_full');
    if (!vipResult.success) {
      await client.rpc('restore_voucher_use', { p_voucher_id: voucherId });
      return fail(vipResult.code, vipResult.error);
    }

    return ok({ coverageType, selfPayAmount: 0, vipExpiresAt: vipResult.data.expiresAt });
  }

  if (coverageType === 'full') {
    return ok({ coverageType, selfPayAmount: 0 });
  }

  const { data: priceRow, error: priceError } = await client
    .from('service_prices')
    .select('price')
    .eq('service_type', serviceType)
    .maybeSingle();

  if (priceError || !priceRow) {
    await client.rpc('restore_voucher_use', { p_voucher_id: voucherId });
    return fail('price_not_found', '找不到该服务的价目');
  }

  const basePrice = priceRow.price as number;
  const selfPayAmount =
    coverageType === 'percentage'
      ? Math.max(0, Math.round(basePrice * (1 - coverageValue / 100)))
      : Math.max(0, basePrice - coverageValue);

  let balanceAfter: number | null = null;

  if (selfPayAmount > 0) {
    const deductResult = await deductWallet(client, userId, selfPayAmount, 'voucher_partial_charge', {
      referenceId,
    });
    if (!deductResult.success) {
      await client.rpc('restore_voucher_use', { p_voucher_id: voucherId });
      return fail(deductResult.code, deductResult.error);
    }
    balanceAfter = deductResult.data.balance;
  } else {
    const { data: wallet } = await client
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    balanceAfter = (wallet?.balance as number | undefined) ?? 0;
  }

  // 对账留痕：这部分是发行方（issuer_label）承担的金额，不实际影响任何人的余额
  await client.from('wallet_transactions').insert({
    user_id: userId,
    amount: basePrice - selfPayAmount,
    balance_after: balanceAfter,
    type: 'sponsor_coverage',
    reference_id: referenceId ?? null,
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
  client: LedgerAdapter,
  input: GrantVoucherInput
): Promise<LedgerResult<ServiceCoverageVoucher>> {
  const { data, error } = await client
    .from('service_coverage_vouchers')
    .insert({
      user_id: input.userId,
      service_type: input.serviceType,
      coverage_type: input.coverageType,
      coverage_value: input.coverageValue,
      remaining_uses: input.remainingUses ?? 1,
      issuer_label: input.issuerLabel ?? null,
      source_batch_id: input.sourceBatchId ?? null,
      actor_id: input.actorId ?? null,
    })
    .select('*')
    .single();

  if (error) return fail('db_error', error.message);

  return ok(data as ServiceCoverageVoucher);
}
