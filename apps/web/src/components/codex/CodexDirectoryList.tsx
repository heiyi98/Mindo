import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { codexSourceLoader } from '@/lib/source';
import type { CodexTopic } from '@/config/codex-topics';

// 平铺列表，不做分类分组。
export async function CodexDirectoryList({ topic, locale }: { topic: CodexTopic; locale: string }) {
  const t = await getTranslations('codex.directory');
  const pages = codexSourceLoader
    .getPages(locale)
    .filter((page) => {
      const slug = page.slugs;
      if (slug.length <= topic.slugPrefix.length) return false;
      return topic.slugPrefix.every((seg, i) => slug[i] === seg);
    });

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>{t('title')}</h1>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pages.map((page) => (
          <li key={page.url}>
            <Link
              href={page.url}
              style={{
                display: 'block',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                textDecoration: 'none',
              }}
            >
              {page.data.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
