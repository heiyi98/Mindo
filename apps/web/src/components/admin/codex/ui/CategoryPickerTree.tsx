'use client';

import { useState } from 'react';

interface Category {
  id: string;
  parent_id: string | null;
}

interface CategoryTranslation {
  id: string;
  category_id: string;
  locale: string;
  name: string;
  slug: string;
}

function displayName(categoryId: string, translations: CategoryTranslation[]): string {
  const rows = translations.filter((t) => t.category_id === categoryId);
  const zh = rows.find((t) => t.locale === 'zh');
  return zh?.name ?? rows[0]?.name ?? '（未命名）';
}

function displaySlug(categoryId: string, translations: CategoryTranslation[]): string {
  const rows = translations.filter((t) => t.category_id === categoryId);
  const zh = rows.find((t) => t.locale === 'zh');
  return zh?.slug ?? rows[0]?.slug ?? '';
}

/** 同一层级下按路径标识（slug）字母顺序排，跟左侧类目树/右侧内容区用同一条规则。 */
function sortBySlug(categories: Category[], translations: CategoryTranslation[]): Category[] {
  return [...categories].sort((a, b) => displaySlug(a.id, translations).localeCompare(displaySlug(b.id, translations)));
}

/** 判断candidateId是不是rootId的子孙（含自己），"移动"弹窗里用来禁掉不合法的目标。 */
function isDescendantOrSelf(candidateId: string, rootId: string, categories: Category[]): boolean {
  let current: string | null = candidateId;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const seen = new Set<string>();
  while (current) {
    if (current === rootId) return true;
    if (seen.has(current)) break;
    seen.add(current);
    current = byId.get(current)?.parent_id ?? null;
  }
  return false;
}

function TreeNode({
  category,
  categories,
  translations,
  depth,
  excludeSubtreeOf,
  initialExpandedIds,
  onPick,
}: {
  category: Category;
  categories: Category[];
  translations: CategoryTranslation[];
  depth: number;
  excludeSubtreeOf?: string;
  initialExpandedIds?: Set<string>;
  onPick: (id: string) => void;
}) {
  // 不传initialExpandedIds时默认全部展开（创建类/创建词条弹窗里的位置选择器
  // 用这个默认值）；传了就只展开这个集合里的节点，其余保持收起（"移动"弹窗
  // 用来只展开"当前所在位置"那条路径，见CategoryPickerTree的调用方说明）。
  const [expanded, setExpanded] = useState(initialExpandedIds ? initialExpandedIds.has(category.id) : true);
  const children = sortBySlug(
    categories.filter((c) => c.parent_id === category.id),
    translations
  );
  const disabled = excludeSubtreeOf ? isDescendantOrSelf(category.id, excludeSubtreeOf, categories) : false;

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', fontSize: 10, width: 12 }}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{ width: 12 }} />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick(category.id)}
          style={{
            background: 'none',
            border: 'none',
            padding: '3px 8px',
            borderRadius: 6,
            textAlign: 'left',
            fontSize: 13,
            color: disabled ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
            cursor: disabled ? 'not-allowed' : 'pointer',
            flex: 1,
          }}
          onMouseEnter={(e) => {
            if (!disabled) e.currentTarget.style.background = 'hsl(var(--accent))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {displayName(category.id, translations)}
        </button>
      </div>
      {expanded &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            category={child}
            categories={categories}
            translations={translations}
            depth={depth + 1}
            excludeSubtreeOf={excludeSubtreeOf}
            initialExpandedIds={initialExpandedIds}
            onPick={onPick}
          />
        ))}
    </div>
  );
}

// 用于"移动"弹窗——逐级点开找目标位置，不做成平铺列表。excludeSubtreeOf传要
// 移动的那个分类自己的id，它自己和它的子孙节点会被禁用（不能把分类挪到自己
// 下面，会形成环）。
export function CategoryPickerTree({
  categories,
  translations,
  excludeSubtreeOf,
  onPick,
  allowRoot = true,
  initialExpandedIds,
}: {
  categories: Category[];
  translations: CategoryTranslation[];
  excludeSubtreeOf?: string;
  onPick: (id: string | null) => void;
  allowRoot?: boolean;
  /** 只展开这个集合里的节点id，其余保持收起；不传则全部展开（默认行为不变） */
  initialExpandedIds?: Set<string>;
}) {
  const roots = sortBySlug(
    categories.filter((c) => c.parent_id === null),
    translations
  );

  return (
    <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid hsl(var(--border))', borderRadius: 8, padding: 8 }}>
      {allowRoot && (
        <button
          type="button"
          onClick={() => onPick(null)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '4px 8px',
            marginBottom: 4,
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
          （顶层）
        </button>
      )}
      {roots.map((root) => (
        <TreeNode
          key={root.id}
          category={root}
          categories={categories}
          translations={translations}
          depth={0}
          excludeSubtreeOf={excludeSubtreeOf}
          initialExpandedIds={initialExpandedIds}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

// "位置"字段：一个只能点开树状选择器来选、不能手打的下拉——外观是个按钮，
// 显示当前选中的分类名，点击展开跟CategoryPickerTree同一套树，选中一个
// 节点就把值存起来、收起面板，不像"移动"弹窗里点了立刻生效，这里选完还要
// 等用户按对话框自己的"创建"按钮才真正提交。用于创建类/创建词条弹窗里
// "位置"这一栏，默认值由调用方通过value传入当前所在分类。
export function LocationPickerField({
  categories,
  translations,
  value,
  onChange,
  allowRoot = false,
  excludeSubtreeOf,
}: {
  categories: Category[];
  translations: CategoryTranslation[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowRoot?: boolean;
  excludeSubtreeOf?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = value ? displayName(value, translations) : allowRoot ? '（顶层）' : '请选择位置';

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>位置</div>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--background))',
            color: value ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <span>{label}</span>
          <span style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              zIndex: 30,
              background: 'hsl(var(--popover))',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <CategoryPickerTree
              categories={categories}
              translations={translations}
              allowRoot={allowRoot}
              excludeSubtreeOf={excludeSubtreeOf}
              onPick={(id) => {
                onChange(id);
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
