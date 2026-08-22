'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/admin/codex/ui/Dialog';

interface XrefSearchResult {
  id: string;
  title: string;
  slug: string;
}

// 选中文字→点"站内链接"→立刻弹出这个搜索框（在CodexEditor里被触发，此时还
// 没有创建任何标记，取消=什么都不留下）。跟本轮其他弹窗共用同一套Dialog外框。
export function XrefSearchDialog({
  locale,
  initialQuery,
  onPick,
  onCancel,
}: {
  locale: string;
  /** 触发这个弹窗前用户在正文里选中的文字，作为搜索框的默认值，不需要重新手打。 */
  initialQuery?: string;
  onPick: (target: XrefSearchResult) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<XrefSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/codex/entries/search?locale=${encodeURIComponent(locale)}&q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data: { results?: XrefSearchResult[] }) => {
          if (!cancelled) setResults(data.results ?? []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, locale]);

  return (
    <Dialog title="选择目标词条" onClose={onCancel} width={340}>
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索词条标题或路径…"
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          fontSize: 13,
          marginBottom: 10,
        }}
      />
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading && <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', padding: 4 }}>搜索中…</div>}
        {!loading && results.length === 0 && (
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', padding: 4 }}>没有匹配的词条</div>
        )}
        {results.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onPick(entry)}
            style={{
              textAlign: 'left',
              padding: '7px 10px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'hsl(var(--foreground))',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--accent))')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ fontSize: 13 }}>{entry.title}</div>
            <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{entry.slug}</div>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
