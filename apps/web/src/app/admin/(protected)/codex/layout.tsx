import { redirect } from 'next/navigation';
import { requireCodexAdmin } from '@/lib/codex/requireCodexAdmin';

// 内容库自己的管理员权限模型（public.admin + codex_admin_scopes），跟外层
// /admin/layout.tsx做的"是不是后台人员"这一层通用检查是同一套账号体系，
// 这里在它之上再叠一层"能管哪些分类"的范围判断，见 requireCodexAdmin.ts
// 的说明。这里做页面级的二次校验（跟其他后台页面同款做法：中间件放行、
// 外层layout挡一次、这里再挡一次，不依赖matcher覆盖所有情况）。
//
// 深浅色主题（ThemeProvider）和顶部导航都收在外层 /admin/layout.tsx 里，
// 这一层不再重复包一份，只保留鉴权 + "仅能编辑被授权范围"这个提示。
export default async function CodexAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireCodexAdmin();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div>
      {!admin.isSuperAdmin && (
        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 16, textAlign: 'right' }}>
          仅能编辑被授权的类范围
        </div>
      )}
      {children}
    </div>
  );
}
