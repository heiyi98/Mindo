import type { DbError } from '../shared/types';
export type { DbError };

// 全站通用的后台人员身份表（public.admin），跟 public.users 彻底分开，不是
// 内容库专属——以后订单管理/客服后台等任何后台功能都复用这张表判断"这个人
// 是不是后台人员"，各自模块自己的权限颗粒度（比如内容库的codex_admin_scopes）
// 建在这张表之上，不属于这个接口的职责。
export interface AdminAccount {
  id: string; // 直接复用对应 auth.users 的 id，不是独立生成的
  email: string;
  display_name: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminRepository {
  getByUserId(userId: string): Promise<{ data: AdminAccount | null; error: DbError | null }>;
}
