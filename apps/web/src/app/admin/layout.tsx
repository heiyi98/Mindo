import Link from 'next/link';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AdminThemeToggle } from '@/components/admin/codex/ui/AdminThemeToggle';

const NAV = [
  { href: '/admin/batches', label: '兑换码批次' },
  { href: '/admin/grant', label: '直接发放' },
  { href: '/admin/prices', label: '价目表' },
  { href: '/admin/rates', label: '充值套餐' },
  { href: '/admin/users', label: '用户账本查询' },
  { href: '/admin/alerts', label: '重试警报' },
  { href: '/admin/codex/entries', label: '知识库' },
];

// 深浅色切换按钮挂在最顶层这条导航栏（用户反馈要跟"内容库""重试警报"这些
// 顶部菜单项同一行），所以ThemeProvider也挪到这一层——不再只包在
// /admin/codex/layout.tsx里，整个/admin下面（含支付后台那几个页面）现在
// 共用同一套主题状态。壳层（这条导航栏+背景）本身跟着CSS变量走，各个子
// 页面自己内部的配色这次没有逐一重新审查，见Mindo-内容库.md相关记录。
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
        <div
          style={{
            borderBottom: '1px solid hsl(var(--border))',
            padding: '16px 24px',
            display: 'flex',
            gap: 24,
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
            Mindo Admin
          </span>
          <nav style={{ display: 'flex', gap: 16 }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div style={{ marginLeft: 'auto' }}>
            <AdminThemeToggle />
          </div>
        </div>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 24px' }}>{children}</div>
      </div>
    </ThemeProvider>
  );
}
