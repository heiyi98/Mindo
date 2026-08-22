'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import CodexEditor, { type CodexEditorHandle, type CitationContent } from '@/components/admin/codex/editor/CodexEditor';

const LOCALE_LABELS: Record<string, string> = {
  zh: '简体中文',
  en: 'English',
  'zh-Hant': '繁體中文',
  fr: 'Français',
  es: 'Español',
  ja: '日本語',
  ko: '한국어',
  it: 'Italiano',
  de: 'Deutsch',
};
// 简体中文固定排最上面，其余语言按语言代码字母顺序自动排，不是写死的顺序。
const LOCALES = ['zh', ...Object.keys(LOCALE_LABELS).filter((l) => l !== 'zh').sort()];

interface EntryTranslationSummary {
  id: string;
  entry_id: string;
  locale: string;
  title: string;
  status: 'draft' | 'published';
}

interface LocaleDetail {
  title: string;
  body: JSONContent;
  status: 'draft' | 'published';
  citations: CitationContent[];
}

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `请求失败（${res.status}）`);
  return data;
}

// 词条编辑面板：被独立路由 entries/[id]/page.tsx（方便直接分享/刷新网址）
// 和工作台原地新建流程共用同一份组件——两处只是"返回时做什么"不一样
// （前者路由跳转，后者只是切回列表视图），逻辑不重复写第二遍。
export function EntryEditorPanel({ entryId, onBack }: { entryId: string; onBack: () => void }) {
  const [summary, setSummary] = useState<EntryTranslationSummary[]>([]);
  const [locale, setLocale] = useState('zh');
  const [localeMenuOpen, setLocaleMenuOpen] = useState(false);
  const [detail, setDetail] = useState<LocaleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const editorRef = useRef<CodexEditorHandle>(null);

  // 路径标识现在是词条级别的，整个词条（不分语言）只有一份，跟summary一起
  // 从entries/[id]这个端点拿，不再随locale切换重新加载。savedEntrySlug记
  // 最后一次成功保存的值，用来判断输入框失焦时是不是真的改过、要不要发请求。
  const [entrySlug, setEntrySlug] = useState('');
  const [savedEntrySlug, setSavedEntrySlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  async function refreshSummary() {
    const data = await api(`/api/admin/codex/entries/${entryId}`);
    setSummary(data.translations ?? []);
    const slug = data.entry?.slug ?? '';
    setEntrySlug(slug);
    setSavedEntrySlug(slug);
  }

  useEffect(() => {
    refreshSummary().catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  useEffect(() => {
    setLoadingDetail(true);
    setSavedNote(null);
    api(`/api/admin/codex/entries/${entryId}/translations/${locale}`)
      .then((data) => {
        const t = data.translation as (EntryTranslationSummary & { body: JSONContent }) | null;
        const citations = (data.citations ?? []) as { title: string; url: string | null }[];
        if (t) {
          setDetail({ title: t.title, body: t.body ?? EMPTY_DOC, status: t.status, citations });
        } else {
          setDetail({ title: '', body: EMPTY_DOC, status: 'draft', citations: [] });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoadingDetail(false));
  }, [entryId, locale]);

  async function saveSlug() {
    const trimmed = entrySlug.trim();
    if (!trimmed) {
      setSlugError('路径标识不能为空');
      setEntrySlug(savedEntrySlug);
      return;
    }
    if (trimmed === savedEntrySlug) return;
    setSavingSlug(true);
    setSlugError(null);
    try {
      await api(`/api/admin/codex/entries/${entryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ slug: trimmed }),
      });
      setEntrySlug(trimmed);
      setSavedEntrySlug(trimmed);
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : '保存失败');
      setEntrySlug(savedEntrySlug);
    } finally {
      setSavingSlug(false);
    }
  }

  async function save(status: 'draft' | 'published') {
    if (!detail) return;
    setSaving(true);
    setError(null);
    setSavedNote(null);
    try {
      const json = editorRef.current?.getJSON() ?? EMPTY_DOC;
      const citations = editorRef.current?.getCitations() ?? [];
      await api(`/api/admin/codex/entries/${entryId}/translations/${locale}`, {
        method: 'PUT',
        body: JSON.stringify({ title: detail.title, body: json, status, citations }),
      });
      setDetail((d) => (d ? { ...d, status } : d));
      await refreshSummary();
      setSavedNote(status === 'published' ? '已保存并发布' : '已保存为草稿');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  const currentSummary = summary.find((t) => t.locale === locale);
  const currentStatusLabel = !currentSummary ? '未撰写' : currentSummary.status === 'published' ? '已发布' : '草稿';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', fontSize: 13, cursor: 'pointer' }}
        >
          ← 返回
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {error && <span style={{ color: 'hsl(var(--destructive))', fontSize: 12 }}>{error}</span>}
          {savedNote && <span style={{ color: '#22c55e', fontSize: 12 }}>{savedNote}</span>}
          <button
            type="button"
            disabled={saving || !detail}
            onClick={() => save('draft')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'transparent',
              color: 'hsl(var(--foreground))',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            保存草稿
          </button>
          <button
            type="button"
            disabled={saving || !detail}
            onClick={() => save('published')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'hsl(var(--color-accent))',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            保存并发布
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setLocaleMenuOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {LOCALE_LABELS[locale]} · {currentStatusLabel} ▾
          </button>
          {localeMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                zIndex: 20,
                width: 200,
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                padding: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {LOCALES.map((l) => {
                const row = summary.find((t) => t.locale === l);
                const label = !row ? '未撰写' : row.status === 'published' ? '已发布' : '草稿';
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLocale(l);
                      setLocaleMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: locale === l ? 'hsl(var(--accent))' : 'transparent',
                      color: 'hsl(var(--foreground))',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{LOCALE_LABELS[l]}</span>
                    <span style={{ color: row ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))', opacity: row ? 1 : 0.6 }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {loadingDetail || !detail ? (
        <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>加载中…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 词条名+路径标识合并一行：左边2份宽度、右边1份，都用占位提示文字，
              不用固定文字标签。路径标识是词条级别的（不分语言），失焦时才
              单独发一次请求保存，不跟标题/正文混在"保存草稿/保存并发布"里。 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={detail.title}
              onChange={(e) => setDetail({ ...detail, title: e.target.value })}
              placeholder="词条名"
              style={{
                flex: 2,
                minWidth: 0,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                fontSize: 14,
                fontWeight: 600,
              }}
            />
            <input
              value={entrySlug}
              onChange={(e) => setEntrySlug(e.target.value)}
              onBlur={saveSlug}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              disabled={savingSlug}
              placeholder="路径标识"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                fontSize: 13,
              }}
            />
          </div>
          {(savingSlug || slugError) && (
            <div style={{ display: 'flex', gap: 8, fontSize: 12, marginTop: -6 }}>
              {savingSlug && <span style={{ color: 'hsl(var(--muted-foreground))' }}>保存中…</span>}
              {slugError && <span style={{ color: 'hsl(var(--destructive))' }}>{slugError}</span>}
            </div>
          )}

          <CodexEditor
            key={locale}
            ref={editorRef}
            locale={locale}
            initialContent={detail.body}
            initialCitations={detail.citations}
          />
        </div>
      )}
    </div>
  );
}
