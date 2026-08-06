import type { LedgerAdapter, LedgerResult, WalletTransactionType } from './types';
import { ok, fail } from './types';

export interface WalletMutationOptions {
  referenceId?: string;
  actorId?: string;
}

/**
 * 扣款。底层调用 deduct_wallet 数据库函数，一步完成"余额>=金额才扣"的原子判断，
 * 不在这里先查余额再判断再扣（中间会有竞态窗口）。
 */
export async function deductWallet(
  client: LedgerAdapter,
  userId: string,
  amount: number,
  type: WalletTransactionType,
  opts: WalletMutationOptions = {}
): Promise<LedgerResult<{ balance: number }>> {
  const { data, error } = await client.rpc('deduct_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_reference_id: opts.referenceId ?? null,
    p_actor_id: opts.actorId ?? null,
  });

  if (error) return fail('db_error', error.message);
  if (data === null) return fail('insufficient_balance', '虚拟币余额不足');

  return ok({ balance: data as number });
}

/**
 * 入账（充值/兑换码/退款/管理员发放通用）。钱包行不存在时数据库函数会自动建一行。
 */
export async function creditWallet(
  client: LedgerAdapter,
  userId: string,
  amount: number,
  type: WalletTransactionType,
  opts: WalletMutationOptions = {}
): Promise<LedgerResult<{ balance: number }>> {
  const { data, error } = await client.rpc('credit_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_reference_id: opts.referenceId ?? null,
    p_actor_id: opts.actorId ?? null,
  });

  if (error) return fail('db_error', error.message);

  return ok({ balance: data as number });
}

/**
 * 退款，语义上就是入账，type固定记为'refund'，供AI生成失败时调用。
 */
export async function refundWallet(
  client: LedgerAdapter,
  userId: string,
  amount: number,
  opts: WalletMutationOptions = {}
): Promise<LedgerResult<{ balance: number }>> {
  return creditWallet(client, userId, amount, 'refund', opts);
}
