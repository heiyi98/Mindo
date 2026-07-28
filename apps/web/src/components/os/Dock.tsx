'use client';
import { useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import {
  House,
  MessagesSquare,
  ShoppingBag,
  MessageCircleMore,
  User
} from 'lucide-react';
import {MindoMark} from '@/components/common/MindoMark';
import {useCurrentProfile} from '@/components/os/CurrentProfileContext';
import {getWuxingColor} from '@/lib/wuxing-colors';

const NAV_ITEMS = [
  {key: 'home',         href: '/dashboard',             icon: House},
  {key: 'assessments',  href: '/dashboard/assessments', icon: null},
  {key: 'forum',        href: '/dashboard/forum',       icon: MessagesSquare},
  {key: 'shop',         href: '/dashboard/shop',        icon: ShoppingBag},
  {key: 'messages',     href: '/dashboard/messages',    icon: MessageCircleMore},
  {key: 'profile',      href: '/dashboard/profile',     icon: User},
] as const;

export function Dock() {
  const pathname = usePathname();
  const {selfWuxing} = useCurrentProfile();
  // 命名空间是 'nav'，不是 'dock'——ui.json 里本来就有 nav 这个对象
  // （home/assessments/forum/shop/messages/profile 六个键），不需要
  // 另外新建一个重复的命名空间。之前有一版误用了 'dock'，导致
  // MISSING_MESSAGE 报错，这次改回来。
  const t = useTranslations('nav');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const activeColor = getWuxingColor(selfWuxing);
  const activeBg = `${activeColor}1F`;

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
        const iconColor = isActive
          ? activeColor
          : 'hsl(var(--muted-foreground))';
        const isAssessments = key === 'assessments';

        return (
          <div
            key={key}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <Link
              href={href as any}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                color: iconColor,
                background: isActive
                  ? activeBg
                  : 'transparent',
                transform: hoveredKey === key ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 150ms ease',
                textDecoration: 'none',
              }}
            >
              {isAssessments
                ? <MindoMark size={22} strokeWidth={70} />
                : <Icon size={18} />
              }
            </Link>

            <AnimatePresence>
              {hoveredKey === key && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: 10,
                    zIndex: 60,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 300,
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {t(key)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}