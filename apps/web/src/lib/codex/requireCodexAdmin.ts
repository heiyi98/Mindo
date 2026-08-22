import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';
import { codexRepository } from './adminClient';
import type { CodexCategory } from '@mindo/db';

export interface CodexAdminContext {
  userId: string;
  isSuperAdmin: boolean;
  /** null = 超级管理员，不限分类 */
  allowedCategoryIds: string[] | null;
}

/**
 * 内容库自己的权限范围模型，建在通用的"这个人是不是后台人员"检查
 * （requireStaffAccount，public.admin 表）之上，再叠一层"他在内容库这边
 * 具体能管哪些分类"（codex_admin_scopes）。这两件事分属两个模块——
 * public.admin 是全站通用的身份表，codex_admin_scopes 是内容库自己的
 * 权限颗粒度，见 Mindo-内容库.md 12.3节。
 *
 * 老的 ADMIN_EMAILS 白名单机制已经拆除，全站后台功能现在统一用这套账号
 * 体系，不再有两套并存的登录方式，见 proxy.ts、/admin/layout.tsx 的说明。
 * 不接公开注册，账号只能靠 apps/web/scripts/create-admin-account.mjs 手动创建。
 *
 * 返回 null 表示未登录、不是后台人员，调用方自己决定返回401/403或跳转登录页。
 */
export async function requireCodexAdmin(): Promise<CodexAdminContext | null> {
  const admin = await requireStaffAccount();
  if (!admin) return null;

  const { data: scopeInfo } = await codexRepository.getScopesForAdmin(admin.id);

  return {
    userId: admin.id,
    isSuperAdmin: !scopeInfo?.scopedCategoryIds,
    allowedCategoryIds: scopeInfo?.scopedCategoryIds ?? null,
  };
}

/**
 * 判断某个分类是否在管理员的授权范围内——授权范围包含"直接授权的分类"和
 * "它们的全部子孙分类"，所以从目标分类开始沿 parent_id 一路往上找到根，
 * 只要链条上（含目标分类自己）有任意一个在 allowedCategoryIds 里就算通过。
 * 需要传入完整分类列表用来查parent_id（categoryId → CodexCategory 的Map）。
 *
 * categoryId传null（顶层词条，不归属任何分类）时，循环一次都不会跑，直接
 * 落到末尾return false——范围受限的管理员天然被挡在外面，只有超级管理员
 * （上面那行已经提前return true）能碰不归属任何分类的顶层词条，这条规则
 * 跟"新建顶层分类只有超级管理员能做"是同一个道理，不需要另外写一次判断。
 */
export function isCategoryInScope(
  categoryId: string | null,
  admin: CodexAdminContext,
  categoriesById: Map<string, CodexCategory>
): boolean {
  if (admin.isSuperAdmin || !admin.allowedCategoryIds) return true;

  const allowed = new Set(admin.allowedCategoryIds);
  let current: string | null = categoryId;
  const seen = new Set<string>();
  while (current) {
    if (allowed.has(current)) return true;
    if (seen.has(current)) break; // 防御环形parent_id（理论上不该出现）
    seen.add(current);
    current = categoriesById.get(current)?.parent_id ?? null;
  }
  return false;
}
