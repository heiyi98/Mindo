import type { PaymentsRepository, LedgerResult, ProTransactionType } from './types';
import { ok, fail } from './types';

/**
 * Pro续期。底层调用 extend_pro 数据库函数：
 * GREATEST(当前到期时间, 现在) + days，保证提前兑换不会吞掉还没到期的时长。
 * 与VIP完全解耦，各自独立判断，互不影响。
 */
export async function extendPro(
  repo: PaymentsRepository,
  userId: string,
  days: number,
  type: ProTransactionType,
  actorId?: string
): Promise<LedgerResult<{ expiresAt: string }>> {
  const { data, error } = await repo.extendProRaw(userId, days, type, actorId ?? null);

  if (error) return fail('db_error', error.message);

  return ok({ expiresAt: data as string });
}

/**
 * 查询Pro是否在有效期内，统一只判断 pro_expires_at > now()。
 */
export async function checkProActive(
  repo: PaymentsRepository,
  userId: string
): Promise<LedgerResult<{ active: boolean; expiresAt: string | null }>> {
  const { data, error } = await repo.getUserProExpiry(userId);

  if (error) return fail('db_error', error.message);
  if (!data) return fail('not_found', '用户不存在');

  const expiresAt = data.pro_expires_at;
  const active = expiresAt !== null && new Date(expiresAt).getTime() > Date.now();

  return ok({ active, expiresAt });
}
