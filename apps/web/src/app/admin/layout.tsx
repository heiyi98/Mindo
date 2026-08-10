import Link from 'next/link';

const NAV = [
  { href: '/admin/batches', label: '兑换码批次' },
  { href: '/admin/grant', label: '直接发放' },
  { href: '/admin/prices', label: '价目表' },
  { href: '/admin/rates', label: '充值套餐' },
  { href: '/admin/users', label: '用户账本查询' },
  { href: '/admin/alerts', label: '重试警报' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5' }}>
      <div style={{ borderBottom: '1px solid #262626', padding: '16px 24px', display: 'flex', gap: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#737373' }}>
          Mindo Admin
        </span>
        <nav style={{ display: 'flex', gap: 16 }}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ fontSize: 13, color: '#a3a3a3', textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>{children}</div>
    </div>
  );
}
