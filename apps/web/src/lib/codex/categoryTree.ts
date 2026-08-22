import type { CodexCategory, CodexCategoryTranslation } from '@mindo/db';

export interface BreadcrumbItem {
  categoryId: string;
  name: string;
  slug: string;
}

/** 从某个分类沿parent_id往上走到顶层，返回从根到它自己的面包屑（含它自己）。
 *  categoryId传null（不归属任何分类的顶层词条）时直接返回空数组，没有面包屑。 */
export function buildBreadcrumb(
  categoryId: string | null,
  categories: CodexCategory[],
  translations: CodexCategoryTranslation[],
  locale: string
): BreadcrumbItem[] {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const items: BreadcrumbItem[] = [];
  let cursor: string | null = categoryId;
  const seen = new Set<string>();

  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const translation = translations.find((t) => t.category_id === cursor && t.locale === locale);
    items.unshift({
      categoryId: cursor,
      name: translation?.name ?? cursor.slice(0, 8),
      slug: translation?.slug ?? cursor.slice(0, 8),
    });
    cursor = categoriesById.get(cursor)?.parent_id ?? null;
  }

  return items;
}

/**
 * 按URL的每一段依次匹配分类树（从顶层开始，每一步只在"当前分类的直接子分类"里
 * 找slug相同的那个），走完整段路径就是命中的分类；中途任何一段找不到匹配就返回
 * null。用于"归类首页"——只有entry_translations按最后一段查不到词条时才会走到
 * 这条路径，见 [...slug]/page.tsx。
 */
export function resolveCategoryByPath(
  slugParts: string[],
  categories: CodexCategory[],
  translations: CodexCategoryTranslation[],
  locale: string
): CodexCategory | null {
  let parentId: string | null = null;
  let matched: CodexCategory | null = null;

  for (const part of slugParts) {
    const candidate = categories.find((c) => {
      if (c.parent_id !== parentId) return false;
      const translation = translations.find((t) => t.category_id === c.id && t.locale === locale);
      return translation?.slug === part;
    });
    if (!candidate) return null;
    matched = candidate;
    parentId = candidate.id;
  }

  return matched;
}
