import { requireApiUser } from '@/lib/auth/requireAuth';
import { adminAccountRepository } from './adminClient';
import type { AdminAccount } from '@mindo/db';

/**
 * 全站通用的"这个人是不是后台人员"检查，靠 public.admin 表里存不存在
 * 这一行判断——跟 public.users 完全独立的身份体系，见迁移SQL顶部说明。
 * 跟老的 ADMIN_EMAILS 白名单机制（曾经是 lib/admin/requireAdmin.ts）是
 * 两套不同思路，那套已经拆除——全部后台功能（内容库/兑换码批次/价目表/
 * 充值套餐/用户账本查询/重试警报/直接发放）现在统一走这一套账号体系，
 * 不再有两套并存的登录方式。
 *
 * 只确认身份，不做任何模块内部的权限范围判断（比如内容库能管哪个分类）——
 * 那部分留给各自模块自己的repository（如 codexRepository.getScopesForAdmin）。
 */
export async function requireStaffAccount(): Promise<AdminAccount | null> {
  const { user } = await requireApiUser();
  console.log('[requireStaffAccount] session user:', user?.id, user?.email);
  if (!user) return null;

  const { data: admin, error } = await adminAccountRepository.getByUserId(user.id);
  console.log('[requireStaffAccount] admin lookup:', admin, 'error:', error);
  return admin;
}
