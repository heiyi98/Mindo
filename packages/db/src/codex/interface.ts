// 内容库（Codex）数据操作契约。业务代码（admin路由、前台渲染）只依赖这份接口，
// 不直接感知底下是Supabase还是别的什么数据库。见 Mindo-内容库.md 数据库驱动章节。

import type { DbError } from '../shared/types';
export type { DbError };

export type CodexEntryStatus = 'draft' | 'published';

export interface CodexCategory {
  id: string;
  parent_id: string | null;
  home_entry_id: string | null;
  created_at: string;
}

export interface CodexCategoryTranslation {
  id: string;
  category_id: string;
  locale: string;
  name: string;
  slug: string;
}

export interface CodexEntry {
  id: string;
  /** null=不归属任何分类的顶层词条，跟顶层分类是同一种性质的节点，只是节点类型不同 */
  category_id: string | null;
  /** 整个词条只有一份，不分语言——跟归类的slug（按语言各自独立）不是一回事 */
  slug: string;
  created_at: string;
  published_at: string | null;
}

export interface CodexEntryTranslation {
  id: string;
  entry_id: string;
  locale: string;
  title: string;
  body: Record<string, unknown>;
  status: CodexEntryStatus;
  updated_at: string;
}

export interface CodexCitation {
  id: string;
  entry_translation_id: string;
  order_index: number;
  title: string;
  url: string | null;
}

export interface CodexAdminScopeInfo {
  /** null = 不限分类（超级管理员）；否则只能编辑这些分类（及其子孙，递归在代码层判断） */
  scopedCategoryIds: string[] | null;
}

export interface CodexEntrySearchResult {
  id: string;
  title: string;
  slug: string;
}

export interface CodexPublishedEntry {
  entry: CodexEntry;
  translation: CodexEntryTranslation;
}

export interface CodexRepository {
  // ---- 归类 ----
  listCategories(): Promise<{ data: CodexCategory[]; error: DbError | null }>;
  listCategoryTranslations(): Promise<{ data: CodexCategoryTranslation[]; error: DbError | null }>;
  getCategoryTranslations(
    categoryId: string
  ): Promise<{ data: CodexCategoryTranslation[]; error: DbError | null }>;

  createCategory(input: {
    parentId: string | null;
    translations: { locale: string; name: string; slug: string }[];
  }): Promise<{ data: { id: string } | null; error: DbError | null }>;

  upsertCategoryTranslation(
    categoryId: string,
    locale: string,
    fields: { name: string; slug: string }
  ): Promise<{ error: DbError | null }>;

  updateCategoryParent(
    categoryId: string,
    parentId: string | null
  ): Promise<{ error: DbError | null }>;

  setCategoryHomeEntry(
    categoryId: string,
    entryId: string | null
  ): Promise<{ error: DbError | null }>;

  /** 删除前置检查：这个分类下还有没有子分类/词条，有则不允许删除（顶层和非顶层统一规则） */
  getCategoryChildCounts(
    categoryId: string
  ): Promise<{ data: { childCategories: number; entries: number } | null; error: DbError | null }>;

  /** 把某分类下的词条批量挪到另一个分类（非顶层删除时先挪词条再删分类用） */
  reassignEntriesCategory(
    fromCategoryId: string,
    toCategoryId: string
  ): Promise<{ error: DbError | null }>;

  /** 把某分类的子分类批量挪到另一个父级（非顶层删除时先挪子分类再删分类用） */
  reassignChildCategoriesParent(
    fromCategoryId: string,
    toParentId: string | null
  ): Promise<{ error: DbError | null }>;

  deleteCategory(categoryId: string): Promise<{ error: DbError | null }>;

  // ---- 词条 ----
  listEntries(filters?: {
    categoryId?: string;
  }): Promise<{ data: CodexEntry[]; error: DbError | null }>;

  listEntryTranslationsForEntries(
    entryIds: string[]
  ): Promise<{ data: CodexEntryTranslation[]; error: DbError | null }>;

  /** 批量取词条本体（含slug）——前台渲染站内链接时用，slug现在挂在这一层，不在译文行上 */
  listEntriesByIds(entryIds: string[]): Promise<{ data: CodexEntry[]; error: DbError | null }>;

  getEntry(id: string): Promise<{ data: CodexEntry | null; error: DbError | null }>;

  getEntryTranslations(
    entryId: string
  ): Promise<{ data: CodexEntryTranslation[]; error: DbError | null }>;

  /** slug创建时就必须定下来，全局唯一，不像归类允许后续慢慢补分类下的翻译。
   *  categoryId传null＝创建一个不归属任何分类的顶层词条。 */
  createEntry(categoryId: string | null, slug: string): Promise<{ data: { id: string } | null; error: DbError | null }>;

  /** 单篇词条改归类（跟"分类删除时批量挪词条"是不同场景，那个是reassignEntriesCategory）。
   *  categoryId传null＝把词条挪成不归属任何分类的顶层词条。 */
  updateEntryCategory(entryId: string, categoryId: string | null): Promise<{ error: DbError | null }>;

  /** 路径标识是词条级别的，改一次对全部语言生效 */
  updateEntrySlug(entryId: string, slug: string): Promise<{ error: DbError | null }>;

  upsertEntryTranslation(
    entryId: string,
    locale: string,
    fields: { title: string; body: Record<string, unknown>; status: CodexEntryStatus }
  ): Promise<{ data: CodexEntryTranslation | null; error: DbError | null }>;

  markEntryPublishedAt(entryId: string): Promise<{ error: DbError | null }>;

  deleteEntry(id: string): Promise<{ error: DbError | null }>;

  getPublishedEntryBySlug(
    locale: string,
    slug: string
  ): Promise<{ data: CodexPublishedEntry | null; error: DbError | null }>;

  listPublishedEntryTranslations(
    locale: string
  ): Promise<{ data: (CodexEntryTranslation & { category_id: string | null; slug: string })[]; error: DbError | null }>;

  searchEntries(
    locale: string,
    query: string,
    limit?: number
  ): Promise<{ data: CodexEntrySearchResult[]; error: DbError | null }>;

  // ---- 引用 ----
  listCitations(
    entryTranslationId: string
  ): Promise<{ data: CodexCitation[]; error: DbError | null }>;

  /** 整篇替换：删掉旧的、按当前文档顺序重新插入，order_index跟正文角标顺序永远同步 */
  replaceCitations(
    entryTranslationId: string,
    citations: { title: string; url: string | null }[]
  ): Promise<{ error: DbError | null }>;

  // ---- 管理员权限范围 ----
  // "这个人是不是后台人员"这件事由 packages/db/src/admin 模块负责（判断
  // public.admin 表里存不存在这一行）；这里只负责"已经确认是后台人员之后，
  // 他在内容库这边的权限范围是什么"，两件事分属两个模块，见
  // apps/web/src/lib/codex/requireCodexAdmin.ts 的组合方式。
  getScopesForAdmin(
    adminId: string
  ): Promise<{ data: CodexAdminScopeInfo | null; error: DbError | null }>;
}
