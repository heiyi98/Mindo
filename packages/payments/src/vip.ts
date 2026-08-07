import type { PaymentsRepository, LedgerResult, VipTransactionType } from './types';
import { ok, fail } from './types';

/**
 * VIP续期。底层调用 extend_vip 数据库函数：
 * GREATEST(当前到期时间, 现在) + days，保证提前兑换不会吞掉还没到期的时长。
 * lifetime会员用一个极远未来日期表示，不需要额外的特殊值判断逻辑。
 */
export async function extendVip(
  repo: PaymentsRepository,
  userId: string,
  days: number,
  type: VipTransactionType,
  actorId?: string
): Promise<LedgerResult<{ expiresAt: string }>> {
  const { data, error } = await repo.extendVipRaw(userId, days, type, actorId ?? null);

  if (error) return fail('db_error', error.message);

  return ok({ expiresAt: data as string });
}

/**
 * 查询VIP是否在有效期内，统一只判断 vip_expires_at > now()。
 */
export async function checkVipActive(
  repo: PaymentsRepository,
  userId: string
): Promise<LedgerResult<{ active: boolean; expiresAt: string | null }>> {
  const { data, error } = await repo.getUserVipExpiry(userId);

  if (error) return fail('db_error', error.message);
  if (!data) return fail('not_found', '用户不存在');

  const expiresAt = data.vip_expires_at;
  const active = expiresAt !== null && new Date(expiresAt).getTime() > Date.now();

  return ok({ active, expiresAt });
}
