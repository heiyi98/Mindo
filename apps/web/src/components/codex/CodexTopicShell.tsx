import type { ReactNode } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { House, ListTree, Search } from 'lucide-react';
import { CodexSearchBox } from './CodexSearchBox';
import type { CodexTopic } from '@/config/codex-topics';

const navLinkStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))',
  fontSize: 13,
  textDecoration: 'none',
} as const;

// 主题范围内的功能入口（该主题范围内的功能入口，非全站导航）：主页/词条清单/搜索，仅此三项。
export async function CodexTopicShell({
  topic,
  locale,
  children,
}: {
  topic: CodexTopic;
  locale: string;
  children: ReactNode;
}) {
  const t = await getTranslations('codex.topicNav');
  const homeHref = `/${locale}/codex/${topic.homeSlug.join('/')}`;
  const directoryHref = `/${locale}/codex/${topic.directorySlug.join('/')}`;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <Link href={homeHref} style={navLinkStyle}>
          <House size={14} />
          {t('home')}
        </Link>
        <Link href={directoryHref} style={navLinkStyle}>
          <ListTree size={14} />
          {t('directory')}
        </Link>

        <div style={{ flex: '1 1 160px', minWidth: 160, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={14} aria-hidden style={{ opacity: 0.6, flexShrink: 0 }} />
          <div style={{ flex: 1 }} aria-label={t('search')}>
            <CodexSearchBox tag={topic.searchTag} />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
