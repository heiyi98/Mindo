'use client';

import { useEffect, useMemo, useState } from 'react';
import { Folder, FileText, Plus, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { EntryEditorPanel } from '@/components/admin/codex/EntryEditorPanel';
import { Dialog, DialogField, DialogActions, DialogButton } from '@/components/admin/codex/ui/Dialog';
import { CategoryPickerTree, LocationPickerField } from '@/components/admin/codex/ui/CategoryPickerTree';
import { useContextMenu, ContextMenuView, type ContextMenuItem } from '@/components/admin/codex/ui/ContextMenu';

interface Category {
  id: string;
  parent_id: string | null;
  home_entry_id: string | null;
  created_at: string;
}

interface CategoryTranslation {
  id: string;
  category_id: string;
  locale: string;
  name: string;
  slug: string;
}

interface Entry {
  id: string;
  /** null＝不归属任何分类的顶层词条，跟顶层分类是同一种性质的节点 */
  category_id: string | null;
  slug: string;
  created_at: string;
  published_at: string | null;
}

interface EntryTranslation {
  id: string;
  entry_id: string;
  locale: string;
  title: string;
  status: 'draft' | 'published';
}

function categoryName(categoryId: string, translations: CategoryTranslation[]): string {
  const rows = translations.filter((t) => t.category_id === categoryId);
  return rows.find((t) => t.locale === 'zh')?.name ?? rows[0]?.name ?? '（未命名）';
}

function categorySlug(categoryId: string, translations: CategoryTranslation[]): string {
  const rows = translations.filter((t) => t.category_id === categoryId);
  return rows.find((t) => t.locale === 'zh')?.slug ?? rows[0]?.slug ?? '';
}

/** 从顶层一路到categoryId的完整路径，中文分类名以"/"连接（如"中国/八字/天干"）。 */
function categoryPath(categoryId: string, categories: Category[], categoryTranslations: CategoryTranslation[]): string {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const names: string[] = [];
  let cursor: string | null = categoryId;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    names.unshift(categoryName(cursor, categoryTranslations));
    cursor = categoriesById.get(cursor)?.parent_id ?? null;
  }
  return names.join('/');
}

/** 跟categoryPath同样的走法，但拼路径标识（slug）不是名字，如"china/bazi/tiangan"。 */
function categorySlugPath(categoryId: string, categories: Category[], categoryTranslations: CategoryTranslation[]): string {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const slugs: string[] = [];
  let cursor: string | null = categoryId;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    slugs.unshift(categorySlug(cursor, categoryTranslations));
    cursor = categoriesById.get(cursor)?.parent_id ?? null;
  }
  return slugs.join('/');
}

/** 词条的完整路径标识字符串（分类slug链+词条自己的slug，如"china/bazi/tiangan/jia"），
 *  没有分类的顶层词条就是它自己的slug。"全部词条"根视图按这个整体做字母排序，
 *  同一分类下的词条会因为路径前缀相同而自然排在一起，不会被打散。 */
function entryFullSlugPath(entry: Entry, categories: Category[], categoryTranslations: CategoryTranslation[]): string {
  if (!entry.category_id) return entry.slug;
  return `${categorySlugPath(entry.category_id, categories, categoryTranslations)}/${entry.slug}`;
}

/** categoryId的全部祖先分类id（不含它自己），从直接父级到根。传null返回空集合。
 *  "移动"弹窗用来算出"当前所在位置"这条路径上要展开哪些节点，见CategoryPickerTree。 */
function ancestorIds(categoryId: string | null, categories: Category[]): Set<string> {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const result = new Set<string>();
  let cursor = categoryId ? categoriesById.get(categoryId)?.parent_id ?? null : null;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    result.add(cursor);
    cursor = categoriesById.get(cursor)?.parent_id ?? null;
  }
  return result;
}

function entryTitle(entryId: string, translations: EntryTranslation[]): string {
  const rows = translations.filter((t) => t.entry_id === entryId);
  return rows.find((t) => t.locale === 'zh')?.title ?? rows[0]?.title ?? '（未撰写）';
}

function entryPublishedCount(entryId: string, translations: EntryTranslation[]): number {
  return translations.filter((t) => t.entry_id === entryId && t.status === 'published').length;
}

async function api(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `请求失败（${res.status}）`);
  return data;
}

type DialogState =
  | { type: 'renameCategory'; categoryId: string }
  | { type: 'createCategory'; parentId: string | null }
  | { type: 'createEntry'; categoryId: string | null }
  | { type: 'renameEntry'; entryId: string }
  | { type: 'moveCategory'; categoryId: string }
  | { type: 'moveEntry'; entryId: string }
  | { type: 'deleteCategory'; categoryId: string }
  | { type: 'deleteEntry'; entryId: string };

export default function CodexWorkspacePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTranslations, setCategoryTranslations] = useState<CategoryTranslation[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entryTranslations, setEntryTranslations] = useState<EntryTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [search, setSearch] = useState('');

  const { menuState, openContextMenu, closeContextMenu } = useContextMenu();

  async function refreshAll() {
    setLoading(true);
    try {
      const [categoriesData, entriesData] = await Promise.all([
        api('/api/admin/codex/categories'),
        api('/api/admin/codex/entries'),
      ]);
      setCategories(categoriesData.categories ?? []);
      setCategoryTranslations(categoriesData.translations ?? []);
      setEntries(entriesData.entries ?? []);
      setEntryTranslations(entriesData.translations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    setSearch('');
  }, [selectedCategoryId]);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  // 左侧类目树同一层级下，组内按各自路径标识（slug）字母顺序排，不再按建档时间。
  const roots = useMemo(
    () =>
      categories
        .filter((c) => c.parent_id === null)
        .sort((a, b) => categorySlug(a.id, categoryTranslations).localeCompare(categorySlug(b.id, categoryTranslations))),
    [categories, categoryTranslations]
  );
  // 不归属任何分类的顶层词条——跟顶层分类是同一种性质的节点（都"没有上级"），
  // 只是节点类型不同，直接摆在左侧类目树最上层、跟顶层分类平级，不单独设专区。
  const rootEntries = useMemo(
    () => entries.filter((e) => e.category_id === null).sort((a, b) => a.slug.localeCompare(b.slug)),
    [entries]
  );

  // 右侧内容区跟左侧类目树展示的是同一份"某个分类下的子项"，排序规则保持
  // 一致：组内按路径标识（slug）字母顺序，不再按建档时间。
  function childCategories(categoryId: string) {
    return categories
      .filter((c) => c.parent_id === categoryId)
      .sort((a, b) => categorySlug(a.id, categoryTranslations).localeCompare(categorySlug(b.id, categoryTranslations)));
  }
  function childEntries(categoryId: string) {
    return entries.filter((e) => e.category_id === categoryId).sort((a, b) => a.slug.localeCompare(b.slug));
  }

  function categoryMenuItems(category: Category): ContextMenuItem[] {
    return [
      { label: '重命名', onSelect: () => setDialog({ type: 'renameCategory', categoryId: category.id }) },
      { label: '移动', onSelect: () => setDialog({ type: 'moveCategory', categoryId: category.id }) },
      { label: '创建子类', onSelect: () => setDialog({ type: 'createCategory', parentId: category.id }) },
      { label: '创建词条', onSelect: () => setDialog({ type: 'createEntry', categoryId: category.id }) },
      { label: '删除', destructive: true, onSelect: () => setDialog({ type: 'deleteCategory', categoryId: category.id }) },
    ];
  }

  function entryMenuItems(entry: Entry): ContextMenuItem[] {
    return [
      { label: '重命名', onSelect: () => setDialog({ type: 'renameEntry', entryId: entry.id }) },
      { label: '移动', onSelect: () => setDialog({ type: 'moveEntry', entryId: entry.id }) },
      { label: '删除', destructive: true, onSelect: () => setDialog({ type: 'deleteEntry', entryId: entry.id }) },
    ];
  }

  const searchQuery = search.trim().toLowerCase();
  function entryMatches(entry: Entry): boolean {
    if (!searchQuery) return true;
    if (entry.slug.toLowerCase().includes(searchQuery)) return true;
    return entryTranslations.some((t) => t.entry_id === entry.id && t.title.toLowerCase().includes(searchQuery));
  }
  function categoryMatches(category: Category): boolean {
    if (!searchQuery) return true;
    return categoryTranslations.some(
      (t) => t.category_id === category.id && (t.name.toLowerCase().includes(searchQuery) || t.slug.toLowerCase().includes(searchQuery))
    );
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ width: 300, flexShrink: 0 }}>
        <h2 style={{ fontSize: 13, marginBottom: 10, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          类
        </h2>

        <div
          onClick={() => setSelectedCategoryId(null)}
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
            marginBottom: 4,
            background: selectedCategoryId === null ? 'hsl(var(--accent))' : 'transparent',
            color: 'hsl(var(--foreground))',
          }}
        >
          全部词条
        </div>

        {loading ? (
          <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>加载中…</div>
        ) : (
          // 词条固定排在上面、分类固定排在下面，是不参与排序的分组，见下方TreeNode
          // 内部子级渲染同款规则。
          <>
            {rootEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setEditingEntryId(entry.id)}
                onContextMenu={(e) => openContextMenu(e, entryMenuItems(entry))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: 'hsl(var(--foreground))',
                }}
              >
                <span style={{ width: 13 }} />
                <FileText size={14} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{entryTitle(entry.id, entryTranslations)}</span>
              </div>
            ))}
            {roots.map((root) => (
              <TreeNode
                key={root.id}
                category={root}
                depth={0}
                categories={categories}
                categoryTranslations={categoryTranslations}
                entries={entries}
                entryTranslations={entryTranslations}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
                onOpenEntry={setEditingEntryId}
                onContextMenuCategory={(e, c) => openContextMenu(e, categoryMenuItems(c))}
                onContextMenuEntry={(e, en) => openContextMenu(e, entryMenuItems(en))}
              />
            ))}
          </>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editingEntryId ? (
          <EntryEditorPanel
            entryId={editingEntryId}
            onBack={() => {
              setEditingEntryId(null);
              refreshAll();
            }}
          />
        ) : (
          <>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <h1 style={{ fontSize: 18 }}>{selectedCategoryId ? categoryName(selectedCategoryId, categoryTranslations) : '全部词条'}</h1>

          <div style={{ marginLeft: 'auto', position: 'relative', display: 'flex' }}>
              <button
                type="button"
                onClick={() => setDialog({ type: 'createEntry', categoryId: selectedCategoryId })}
                title="创建词条"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: '8px 0 0 8px',
                  border: 'none',
                  background: 'hsl(var(--color-accent))',
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                创建
              </button>
              <button
                type="button"
                onClick={() => setCreateMenuOpen((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 6px',
                  borderRadius: '0 8px 8px 0',
                  border: 'none',
                  borderLeft: '1px solid rgba(255,255,255,0.25)',
                  background: 'hsl(var(--color-accent))',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <ChevronDown size={14} />
              </button>
              {createMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    zIndex: 20,
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    padding: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDialog({ type: 'createEntry', categoryId: selectedCategoryId });
                      setCreateMenuOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: 'hsl(var(--foreground))',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--accent))')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    创建词条
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDialog({ type: 'createCategory', parentId: selectedCategoryId });
                      setCreateMenuOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      color: 'hsl(var(--foreground))',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--accent))')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    创建类
                  </button>
                </div>
              )}
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={selectedCategoryId ? '在这个类里搜索…' : '搜索全部词条/类…'}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              fontSize: 13,
            }}
          />
        </div>

        {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {loading ? (
          <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>加载中…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {selectedCategoryId === null
              ? // "全部词条"根视图按完整路径标识（分类slug链+词条自己的slug）整体做
                // 字母排序，同一分类下的词条因为路径前缀相同会自然排在一起。
                [...entries]
                  .filter(entryMatches)
                  .sort((a, b) =>
                    entryFullSlugPath(a, categories, categoryTranslations).localeCompare(
                      entryFullSlugPath(b, categories, categoryTranslations)
                    )
                  )
                  .map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      entryTranslations={entryTranslations}
                      showCategory
                      categories={categories}
                      categoryTranslations={categoryTranslations}
                      onOpen={() => setEditingEntryId(entry.id)}
                      onContextMenu={(e) => openContextMenu(e, entryMenuItems(entry))}
                    />
                  ))
              : [
                  // 词条固定排在上面，分类固定排在下面，这是不参与排序的分组，
                  // 组内按各自路径标识（slug）字母顺序排，见childEntries/childCategories。
                  ...childEntries(selectedCategoryId).filter(entryMatches).map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      entryTranslations={entryTranslations}
                      onOpen={() => setEditingEntryId(entry.id)}
                      onContextMenu={(e) => openContextMenu(e, entryMenuItems(entry))}
                    />
                  )),
                  ...childCategories(selectedCategoryId).filter(categoryMatches).map((c) => (
                    <CategoryRow
                      key={c.id}
                      category={c}
                      categoryTranslations={categoryTranslations}
                      entryCount={childEntries(c.id).length}
                      onOpen={() => setSelectedCategoryId(c.id)}
                      onContextMenu={(e) => openContextMenu(e, categoryMenuItems(c))}
                    />
                  )),
                ]}
            {selectedCategoryId === null && searchQuery && entries.filter(entryMatches).length === 0 && (
              <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>没有匹配的结果</div>
            )}
            {selectedCategoryId &&
              childCategories(selectedCategoryId).filter(categoryMatches).length === 0 &&
              childEntries(selectedCategoryId).filter(entryMatches).length === 0 && (
                <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                  {searchQuery ? '没有匹配的结果' : '这个类下面还没有内容'}
                </div>
              )}
          </div>
        )}
          </>
        )}
      </div>

      <ContextMenuView state={menuState} onClose={closeContextMenu} />

      {dialog && (
        <DialogRouter
          dialog={dialog}
          categories={categories}
          categoryTranslations={categoryTranslations}
          categoriesById={categoriesById}
          entries={entries}
          onClose={() => setDialog(null)}
          onDone={(openEntryId) => {
            setDialog(null);
            if (openEntryId) {
              setEditingEntryId(openEntryId);
            } else {
              refreshAll();
            }
          }}
        />
      )}
    </div>
  );
}

function TreeNode({
  category,
  depth,
  categories,
  categoryTranslations,
  entries,
  entryTranslations,
  selectedCategoryId,
  onSelectCategory,
  onOpenEntry,
  onContextMenuCategory,
  onContextMenuEntry,
}: {
  category: Category;
  depth: number;
  categories: Category[];
  categoryTranslations: CategoryTranslation[];
  entries: Entry[];
  entryTranslations: EntryTranslation[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  onOpenEntry: (id: string) => void;
  onContextMenuCategory: (e: React.MouseEvent, category: Category) => void;
  onContextMenuEntry: (e: React.MouseEvent, entry: Entry) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  // 同一层级下，词条/分类各自组内按路径标识（slug）字母顺序排，不再按建档时间。
  const childCats = categories
    .filter((c) => c.parent_id === category.id)
    .sort((a, b) => categorySlug(a.id, categoryTranslations).localeCompare(categorySlug(b.id, categoryTranslations)));
  const childEntriesList = entries
    .filter((e) => e.category_id === category.id)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const hasChildren = childCats.length > 0 || childEntriesList.length > 0;
  const isSelected = selectedCategoryId === category.id;

  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div
        onContextMenu={(e) => onContextMenuCategory(e, category)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          borderRadius: 6,
          cursor: 'pointer',
          background: isSelected ? 'hsl(var(--accent))' : 'transparent',
        }}
        onClick={() => onSelectCategory(category.id)}
      >
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            style={{ display: 'flex', color: 'hsl(var(--muted-foreground))' }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        ) : (
          <span style={{ width: 13 }} />
        )}
        <Folder size={14} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: 'hsl(var(--foreground))' }}>{categoryName(category.id, categoryTranslations)}</span>
      </div>

      {expanded && (
        // 词条固定排在上面、分类固定排在下面，是不参与排序的分组，跟左侧根级
        // 列表、右侧内容区列表用同一条规则。
        <>
          {childEntriesList.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onOpenEntry(entry.id)}
              onContextMenu={(e) => onContextMenuEntry(e, entry)}
              style={{
                marginLeft: (depth + 1) * 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 6px',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'hsl(var(--foreground))',
              }}
            >
              <span style={{ width: 13 }} />
              <FileText size={14} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>{entryTitle(entry.id, entryTranslations)}</span>
            </div>
          ))}
          {childCats.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              depth={depth + 1}
              categories={categories}
              categoryTranslations={categoryTranslations}
              entries={entries}
              entryTranslations={entryTranslations}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              onOpenEntry={onOpenEntry}
              onContextMenuCategory={onContextMenuCategory}
              onContextMenuEntry={onContextMenuEntry}
            />
          ))}
        </>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  categoryTranslations,
  entryCount,
  onOpen,
  onContextMenu,
}: {
  category: Category;
  categoryTranslations: CategoryTranslation[];
  entryCount: number;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onOpen}
      onContextMenu={onContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid hsl(var(--border))',
        cursor: 'pointer',
        fontSize: 13,
        color: 'hsl(var(--foreground))',
      }}
    >
      <Folder size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
      <span>{categoryName(category.id, categoryTranslations)}</span>
      <span style={{ marginLeft: 'auto', color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{entryCount} 篇词条</span>
    </div>
  );
}

function EntryRow({
  entry,
  entryTranslations,
  showCategory,
  categories,
  categoryTranslations,
  onOpen,
  onContextMenu,
}: {
  entry: Entry;
  entryTranslations: EntryTranslation[];
  showCategory?: boolean;
  categories?: Category[];
  categoryTranslations?: CategoryTranslation[];
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onOpen}
      onContextMenu={onContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid hsl(var(--border))',
        cursor: 'pointer',
        fontSize: 13,
        color: 'hsl(var(--foreground))',
      }}
    >
      <FileText size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
      <span>{entryTitle(entry.id, entryTranslations)}</span>
      {/* 顶层词条没有父类，什么都不显示，不画蛇添足标"（顶层）" */}
      {showCategory && categories && categoryTranslations && entry.category_id && (
        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>
          {categoryPath(entry.category_id, categories, categoryTranslations)}
        </span>
      )}
      <span style={{ marginLeft: 'auto', color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>
        {entryPublishedCount(entry.id, entryTranslations)}/9 语言已发布
      </span>
    </div>
  );
}

function DialogRouter({
  dialog,
  categories,
  categoryTranslations,
  categoriesById,
  entries,
  onClose,
  onDone,
}: {
  dialog: DialogState;
  categories: Category[];
  categoryTranslations: CategoryTranslation[];
  categoriesById: Map<string, Category>;
  entries: Entry[];
  onClose: () => void;
  onDone: (openEntryId?: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function run(fn: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      setSaving(false);
    }
  }

  if (dialog.type === 'renameCategory') {
    const [name, setName] = useTwoFieldState(categoryName(dialog.categoryId, categoryTranslations));
    const [slug, setSlug] = useTwoFieldState(categorySlug(dialog.categoryId, categoryTranslations));

    return (
      <Dialog title="重命名" onClose={onClose}>
        <DialogField label="路径标识" value={slug} onChange={setSlug} placeholder="路径标识" autoFocus />
        <DialogField label="类名" value={name} onChange={setName} placeholder="类名" />
        {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <DialogActions>
          <DialogButton onClick={onClose}>取消</DialogButton>
          <DialogButton
            variant="primary"
            disabled={saving}
            onClick={() =>
              run(async () => {
                if (!name.trim() || !slug.trim()) throw new Error('两项都不能为空');
                await api(`/api/admin/codex/categories/${dialog.categoryId}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ translation: { locale: 'zh', name: name.trim(), slug: slug.trim() } }),
                });
                onDone();
              })
            }
          >
            {saving ? '保存中…' : '保存'}
          </DialogButton>
        </DialogActions>
      </Dialog>
    );
  }

  if (dialog.type === 'createCategory' || dialog.type === 'createEntry') {
    return (
      <CreateNodeDialog
        dialog={dialog}
        categories={categories}
        categoryTranslations={categoryTranslations}
        onClose={onClose}
        onDone={onDone}
      />
    );
  }

  if (dialog.type === 'renameEntry') {
    return <RenameEntryDialog dialog={dialog} onClose={onClose} onDone={onDone} />;
  }

  if (dialog.type === 'moveCategory') {
    // 打开弹窗时只展开"当前所在位置"这条路径（从根到它现在的上级），
    // 其余分支保持收起，不再全部展开。
    const expandedIds = ancestorIds(dialog.categoryId, categories);
    return (
      <Dialog title="移动到…" onClose={onClose} width={320}>
        {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <CategoryPickerTree
          categories={categories}
          translations={categoryTranslations}
          excludeSubtreeOf={dialog.categoryId}
          initialExpandedIds={expandedIds}
          onPick={(parentId) =>
            run(async () => {
              await api(`/api/admin/codex/categories/${dialog.categoryId}`, {
                method: 'PATCH',
                body: JSON.stringify({ parentId }),
              });
              onDone();
            })
          }
        />
      </Dialog>
    );
  }

  if (dialog.type === 'moveEntry') {
    // 同上，只展开这个词条当前所属分类那条路径（含它自己）；词条本来就没有
    // 分类（顶层）时不需要展开任何节点，"（顶层）"这个选项本来就直接可见。
    const currentCategoryId = entries.find((e) => e.id === dialog.entryId)?.category_id ?? null;
    const expandedIds = ancestorIds(currentCategoryId, categories);
    if (currentCategoryId) expandedIds.add(currentCategoryId);
    return (
      <Dialog title="移动到…" onClose={onClose} width={320}>
        {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <CategoryPickerTree
          categories={categories}
          translations={categoryTranslations}
          allowRoot
          initialExpandedIds={expandedIds}
          onPick={(categoryId) =>
            run(async () => {
              await api(`/api/admin/codex/entries/${dialog.entryId}`, {
                method: 'PATCH',
                body: JSON.stringify({ categoryId }),
              });
              onDone();
            })
          }
        />
      </Dialog>
    );
  }

  if (dialog.type === 'deleteCategory') {
    return (
      <Dialog title="删除这个类？" onClose={onClose} width={320}>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
          {categoriesById.get(dialog.categoryId)?.parent_id === null
            ? '顶层类只要下面还有内容就不能删除。'
            : '下面的词条/子类会自动挪到上一级。'}
        </p>
        {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginTop: 8 }}>{error}</div>}
        <DialogActions>
          <DialogButton onClick={onClose}>取消</DialogButton>
          <DialogButton
            variant="destructive"
            disabled={saving}
            onClick={() =>
              run(async () => {
                await api(`/api/admin/codex/categories/${dialog.categoryId}`, { method: 'DELETE' });
                onDone();
              })
            }
          >
            {saving ? '删除中…' : '确定删除'}
          </DialogButton>
        </DialogActions>
      </Dialog>
    );
  }

  if (dialog.type === 'deleteEntry') {
    return (
      <Dialog title="删除这篇词条？" onClose={onClose} width={320}>
        <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
          全部9种语言的内容都会一起删除，无法恢复。
        </p>
        {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginTop: 8 }}>{error}</div>}
        <DialogActions>
          <DialogButton onClick={onClose}>取消</DialogButton>
          <DialogButton
            variant="destructive"
            disabled={saving}
            onClick={() =>
              run(async () => {
                await api(`/api/admin/codex/entries/${dialog.entryId}`, { method: 'DELETE' });
                onDone();
              })
            }
          >
            {saving ? '删除中…' : '确定删除'}
          </DialogButton>
        </DialogActions>
      </Dialog>
    );
  }

  return null;
}

// 简单的useState封装，方便DialogRouter按分支各自声明不同的初始值——
// 每次dialog状态从null变成一个新对象时DialogRouter都是全新挂载（父级用
// {dialog && <DialogRouter .../>}，关闭时先归零成null再打开下一个），
// 同一次挂载生命周期里dialog.type不会变，不会违反hooks调用顺序规则。
function useTwoFieldState(initial: string) {
  return useState(initial);
}

// 占位提示文字输入框：没有固定文字标签，空白时显示浅灰色占位字，打字后消失。
// 创建弹窗（CreateNodeDialog）和重命名词条弹窗共用这一个，样式统一。
function PlaceholderInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: 12,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        fontSize: 13,
      }}
    />
  );
}

// 创建类和创建词条共用同一个弹窗组件，不各写一份：位置（树状下拉，一行）→
// 路径标识（一行）→名字（一行，类叫"类名"、词条叫"词条名"）。词条现在也
// 允许"不归属任何分类"（跟顶层分类是同一种性质的节点），位置下拉两边统一
// 都带"（顶层）"这个选项，不用再为词条单独关掉它。
function CreateNodeDialog({
  dialog,
  categories,
  categoryTranslations,
  onClose,
  onDone,
}: {
  dialog: Extract<DialogState, { type: 'createCategory' | 'createEntry' }>;
  categories: Category[];
  categoryTranslations: CategoryTranslation[];
  onClose: () => void;
  onDone: (openEntryId?: string) => void;
}) {
  const isEntry = dialog.type === 'createEntry';
  const [locationId, setLocationId] = useState<string | null>(
    isEntry ? dialog.categoryId : dialog.parentId
  );
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameLabel = isEntry ? '词条名' : '类名';

  async function submit() {
    if (!slug.trim() || !name.trim()) {
      setError(`路径标识和${nameLabel}都不能为空`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEntry) {
        const created = await api('/api/admin/codex/entries', {
          method: 'POST',
          body: JSON.stringify({ categoryId: locationId, slug: slug.trim() }),
        });
        await api(`/api/admin/codex/entries/${created.id}/translations/zh`, {
          method: 'PUT',
          body: JSON.stringify({ title: name.trim(), body: { type: 'doc', content: [] }, status: 'draft', citations: [] }),
        });
        onDone(created.id);
      } else {
        await api('/api/admin/codex/categories', {
          method: 'POST',
          body: JSON.stringify({ parentId: locationId, name: name.trim(), slug: slug.trim() }),
        });
        onDone();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
      setSaving(false);
    }
  }

  return (
    <Dialog title={isEntry ? '创建词条' : '创建类'} onClose={onClose}>
      <LocationPickerField
        categories={categories}
        translations={categoryTranslations}
        value={locationId}
        onChange={setLocationId}
        allowRoot
      />
      <PlaceholderInput value={slug} onChange={setSlug} placeholder="路径标识" autoFocus />
      <PlaceholderInput value={name} onChange={setName} placeholder={nameLabel} />
      {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <DialogActions>
        <DialogButton onClick={onClose}>取消</DialogButton>
        <DialogButton variant="primary" disabled={saving} onClick={submit}>
          {saving ? '创建中…' : '创建'}
        </DialogButton>
      </DialogActions>
    </Dialog>
  );
}

function RenameEntryDialog({
  dialog,
  onClose,
  onDone,
}: {
  dialog: Extract<DialogState, { type: 'renameEntry' }>;
  onClose: () => void;
  onDone: (openEntryId?: string) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ body: unknown; status: string } | null>(null);

  // 路径标识现在挂在词条本身（codex_entries.slug），不再是某个语言翻译的
  // 字段，所以要分开取两处数据：entries/[id]拿路径标识，translations/zh拿
  // 标题+正文+发布状态。
  useEffect(() => {
    Promise.all([
      api(`/api/admin/codex/entries/${dialog.entryId}`),
      api(`/api/admin/codex/entries/${dialog.entryId}/translations/zh`),
    ])
      .then(([entryData, trData]) => {
        setSlug(entryData.entry?.slug ?? '');
        setName(trData.translation?.title ?? '');
        setExisting({ body: trData.translation?.body ?? { type: 'doc', content: [] }, status: trData.translation?.status ?? 'draft' });
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [dialog]);

  async function submit() {
    if (!name.trim() || !slug.trim()) {
      setError('词条名和路径标识都不能为空');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/codex/entries/${dialog.entryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ slug: slug.trim() }),
      });
      await api(`/api/admin/codex/entries/${dialog.entryId}/translations/zh`, {
        method: 'PUT',
        body: JSON.stringify({
          title: name.trim(),
          body: existing?.body ?? { type: 'doc', content: [] },
          status: existing?.status ?? 'draft',
          citations: [],
        }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setSaving(false);
    }
  }

  return (
    <Dialog title="重命名" onClose={onClose}>
      {loading ? (
        <div style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>加载中…</div>
      ) : (
        <>
          <PlaceholderInput value={name} onChange={setName} placeholder="词条名" autoFocus />
          <PlaceholderInput value={slug} onChange={setSlug} placeholder="路径标识" />
          {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <DialogActions>
            <DialogButton onClick={onClose}>取消</DialogButton>
            <DialogButton variant="primary" disabled={saving} onClick={submit}>
              {saving ? '保存中…' : '保存'}
            </DialogButton>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
