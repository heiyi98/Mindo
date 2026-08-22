import { redirect } from 'next/navigation';
import { requireStaffAccount } from '@/lib/admin/requireStaffAccount';

// 全站所有后台功能（兑换码批次/直接发放/价目表/充值套餐/用户账本查询/
// 重试警报/内容库）共用的鉴权闸门——判断"这个人是不是public.admin表里的
// 后台人员"，不区分具体是哪个后台功能，见requireStaffAccount.ts的说明。
//
// 用route group（不影响网址）把这一批页面跟/admin/login分开：登录页
// 本身不能被这层挡住（会造成"没登录→跳登录页→登录页也被这层拦住→
// 再跳登录页"的死循环），所以login/page.tsx故意放在这个group外面，
// 直接挂在/admin/layout.tsx（只有nav+主题，没有鉴权）下面。
//
// 内容库（codex/）在这层之上还有自己的requireCodexAdmin()做"能管哪些
// 分类"的二次范围判断，两层不冲突——这层只负责"是不是后台人员"这个
// 最基础的门槛。
export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireStaffAccount();
  if (!admin) {
    redirect('/admin/login');
  }

  return <>{children}</>;
}
