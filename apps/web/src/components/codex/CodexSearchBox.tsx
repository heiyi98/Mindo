'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import Link from 'next/link';

export function CodexSearchBox({ tag }: { tag?: string } = {}) {
  const locale = useLocale();
  const t = useTranslations('codex.search');
  const { search, setSearch, query } = useDocsSearch({
    client: fetchClient({ api: '/api/codex/search', locale, tag }),
  });

  return (
    <div style={{ maxWidth: 480 }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('placeholder')}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid currentColor',
          borderRadius: 6,
          background: 'transparent',
        }}
      />
      {query.isLoading && <p>{t('loading')}</p>}
      {query.data === 'empty' && <p>{t('empty')}</p>}
      {Array.isArray(query.data) && query.data.length > 0 && (
        <ul style={{ marginTop: 8, listStyle: 'none', padding: 0 }}>
          {query.data
            .filter((item) => item.type === 'page')
            .map((item) => (
              <li key={item.id}>
                <Link href={item.url}>{item.content}</Link>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
