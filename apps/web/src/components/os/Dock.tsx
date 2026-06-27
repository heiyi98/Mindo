'use client';
import {usePathname} from '@/i18n/navigation';
import {Link} from '@/i18n/navigation';
import {
  Home,
  MessageSquare,
  ShoppingBag,
  Mail,
  User
} from 'lucide-react';

function MindoIcon({ color }: { color: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mindo">
      <g stroke={color} strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10">
        <path d="M 264.786404500042 826.460551068478 A 400 400 0 0 1 512 112 L 512 317.652678442978 A 152.786404500042 152.786404500042 0 0 1 453.640786499874 437.774425937465 A 94.4271909999159 94.4271909999159 0 0 0 453.640786499874 586.225574062535" />
        <path d="M 759.213595499958 197.539448931522 A 400 400 0 0 1 512 912 L 512 706.347321557022 A 152.786404500042 152.786404500042 0 0 1 570.359213500126 586.225574062535 A 94.4271909999159 94.4271909999159 0 0 0 570.359213500126 437.774425937465" />
      </g>
    </svg>
  );
}

const NAV_ITEMS = [
  {key: 'home',        href: '/dashboard',             icon: Home},
  {key: 'divination',  href: '/dashboard/divination',  icon: null},
  {key: 'forum',       href: '/dashboard/forum',       icon: MessageSquare},
  {key: 'shop',        href: '/dashboard/shop',        icon: ShoppingBag},
  {key: 'messages',    href: '/dashboard/messages',    icon: Mail},
  {key: 'profile',     href: '/dashboard/profile',     icon: User},
] as const;

export function Dock() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 48,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
        gap: 4,
        background: 'var(--glass-bg)',
        borderRight: '1px solid var(--glass-border)',
        backdropFilter: 'blur(var(--glass-blur))',
      }}
    >
      {NAV_ITEMS.map(({key, href, icon: Icon}: any) => {
        const isActive = pathname === href ||
          (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={key}
            href={href as any}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              color: isActive
                ? 'var(--color-accent)'
                : 'hsl(var(--muted-foreground))',
              background: isActive
                ? 'var(--color-accent-dim)'
                : 'transparent',
              transition: 'all 150ms ease',
              textDecoration: 'none',
            }}
          >
            {key === 'divination'
            ? <MindoIcon color={isActive ? 'var(--color-accent)' : 'hsl(var(--muted-foreground))'}  />
            : <Icon size={18} />
          }
          </Link>
        );
      })}
    </nav>
  );
}