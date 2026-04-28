'use client';
import {usePathname} from '@/i18n/navigation';
import {Link} from '@/i18n/navigation';
import {
  Home,
  Sparkles,
  MessageSquare,
  ShoppingBag,
  Mail,
  User
} from 'lucide-react';

const NAV_ITEMS = [
  {key: 'home',        href: '/dashboard',             icon: Home},
  {key: 'divination',  href: '/dashboard/divination',  icon: Sparkles},
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
      {NAV_ITEMS.map(({key, href, icon: Icon}) => {
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
            <Icon size={18} />
          </Link>
        );
      })}
    </nav>
  );
}
