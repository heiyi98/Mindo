import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CodexAdminScopeInfo,
  CodexCategory,
  CodexCategoryTranslation,
  CodexCitation,
  CodexEntry,
  CodexEntryStatus,
  CodexEntrySearchResult,
  CodexEntryTranslation,
  CodexPublishedEntry,
  CodexRepository,
  DbError,
} from './interface';

function toDbError(error: { message: string; code?: string } | null): DbError | null {
  if (!error) return null;
  return { message: error.message, code: error.code };
}

export function createSupabaseCodexRepository(client: SupabaseClient): CodexRepository {
  return {
    async listCategories() {
      const { data, error } = await client
        .from('codex_categories')
        .select('*')
        .order('created_at', { ascending: true });
      return { data: (data ?? []) as CodexCategory[], error: toDbError(error) };
    },

    async listCategoryTranslations() {
      const { data, error } = await client.from('codex_category_translations').select('*');
      return { data: (data ?? []) as CodexCategoryTranslation[], error: toDbError(error) };
    },

    async getCategoryTranslations(categoryId) {
      const { data, error } = await client
        .from('codex_category_translations')
        .select('*')
        .eq('category_id', categoryId);
      return { data: (data ?? []) as CodexCategoryTranslation[], error: toDbError(error) };
    },

    async createCategory({ parentId, translations }) {
      const { data: category, error: categoryError } = await client
        .from('codex_categories')
        .insert({ parent_id: parentId })
        .select('id')
        .single();
      if (categoryError || !category) {
        return { data: null, error: toDbError(categoryError) };
      }

      const rows = translations.map((t) => ({
        category_id: category.id,
        locale: t.locale,
        name: t.name,
        slug: t.slug,
      }));
      const { error: translationError } = await client
        .from('codex_category_translations')
        .insert(rows);
      if (translationError) {
        return { data: null, error: toDbError(translationError) };
      }

      return { data: { id: category.id as string }, error: null };
    },

    async upsertCategoryTranslation(categoryId, locale, fields) {
      const { error } = await client
        .from('codex_category_translations')
        .upsert(
          { category_id: categoryId, locale, name: fields.name, slug: fields.slug },
          { onConflict: 'category_id,locale' }
        );
      return { error: toDbError(error) };
    },

    async updateCategoryParent(categoryId, parentId) {
      const { error } = await client
        .from('codex_categories')
        .update({ parent_id: parentId })
        .eq('id', categoryId);
      return { error: toDbError(error) };
    },

    async setCategoryHomeEntry(categoryId, entryId) {
      const { error } = await client
        .from('codex_categories')
        .update({ home_entry_id: entryId })
        .eq('id', categoryId);
      return { error: toDbError(error) };
    },

    async getCategoryChildCounts(categoryId) {
      const [{ count: childCategories, error: catErr }, { count: entries, error: entryErr }] =
        await Promise.all([
          client
            .from('codex_categories')
            .select('id', { count: 'exact', head: true })
            .eq('parent_id', categoryId),
          client
            .from('codex_entries')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', categoryId),
        ]);
      const error = catErr ?? entryErr;
      if (error) return { data: null, error: toDbError(error) };
      return {
        data: { childCategories: childCategories ?? 0, entries: entries ?? 0 },
        error: null,
      };
    },

    async reassignEntriesCategory(fromCategoryId, toCategoryId) {
      const { error } = await client
        .from('codex_entries')
        .update({ category_id: toCategoryId })
        .eq('category_id', fromCategoryId);
      return { error: toDbError(error) };
    },

    async reassignChildCategoriesParent(fromCategoryId, toParentId) {
      const { error } = await client
        .from('codex_categories')
        .update({ parent_id: toParentId })
        .eq('parent_id', fromCategoryId);
      return { error: toDbError(error) };
    },

    async deleteCategory(categoryId) {
      const { error } = await client.from('codex_categories').delete().eq('id', categoryId);
      return { error: toDbError(error) };
    },

    async listEntries(filters) {
      let query = client.from('codex_entries').select('*').order('created_at', { ascending: false });
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      const { data, error } = await query;
      return { data: (data ?? []) as CodexEntry[], error: toDbError(error) };
    },

    async listEntryTranslationsForEntries(entryIds) {
      if (entryIds.length === 0) return { data: [], error: null };
      const { data, error } = await client
        .from('codex_entry_translations')
        .select('*')
        .in('entry_id', entryIds);
      return { data: (data ?? []) as CodexEntryTranslation[], error: toDbError(error) };
    },

    async listEntriesByIds(entryIds) {
      if (entryIds.length === 0) return { data: [], error: null };
      const { data, error } = await client.from('codex_entries').select('*').in('id', entryIds);
      return { data: (data ?? []) as CodexEntry[], error: toDbError(error) };
    },

    async getEntry(id) {
      const { data, error } = await client.from('codex_entries').select('*').eq('id', id).maybeSingle();
      return { data: data as CodexEntry | null, error: toDbError(error) };
    },

    async getEntryTranslations(entryId) {
      const { data, error } = await client
        .from('codex_entry_translations')
        .select('*')
        .eq('entry_id', entryId);
      return { data: (data ?? []) as CodexEntryTranslation[], error: toDbError(error) };
    },

    async createEntry(categoryId, slug) {
      const { data, error } = await client
        .from('codex_entries')
        .insert({ category_id: categoryId, slug })
        .select('id')
        .single();
      if (error || !data) return { data: null, error: toDbError(error) };
      return { data: { id: data.id as string }, error: null };
    },

    async upsertEntryTranslation(entryId, locale, fields) {
      const { data, error } = await client
        .from('codex_entry_translations')
        .upsert(
          {
            entry_id: entryId,
            locale,
            title: fields.title,
            body: fields.body,
            status: fields.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'entry_id,locale' }
        )
        .select('*')
        .single();
      return { data: data as CodexEntryTranslation | null, error: toDbError(error) };
    },

    async updateEntryCategory(entryId, categoryId) {
      const { error } = await client.from('codex_entries').update({ category_id: categoryId }).eq('id', entryId);
      return { error: toDbError(error) };
    },

    async updateEntrySlug(entryId, slug) {
      const { error } = await client.from('codex_entries').update({ slug }).eq('id', entryId);
      return { error: toDbError(error) };
    },

    async markEntryPublishedAt(entryId) {
      const { data: existing, error: readError } = await client
        .from('codex_entries')
        .select('published_at')
        .eq('id', entryId)
        .maybeSingle();
      if (readError) return { error: toDbError(readError) };
      if (existing?.published_at) return { error: null }; // 已经记过首次发布时间，不覆盖

      const { error } = await client
        .from('codex_entries')
        .update({ published_at: new Date().toISOString() })
        .eq('id', entryId);
      return { error: toDbError(error) };
    },

    async deleteEntry(id) {
      const { error } = await client.from('codex_entries').delete().eq('id', id);
      return { error: toDbError(error) };
    },

    async getPublishedEntryBySlug(locale, slug) {
      // slug现在挂在entries表，先按slug找到词条本身，再查它这个语言有没有
      // 已发布的翻译——两次查询，不用join，逻辑更直白，这条路径不是高频
      // 热路径，不值得为了省一次round trip去拼PostgREST的嵌套过滤语法。
      const { data: entry, error: entryError } = await client
        .from('codex_entries')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (entryError) return { data: null, error: toDbError(entryError) };
      if (!entry) return { data: null, error: null };

      const { data: translation, error: trError } = await client
        .from('codex_entry_translations')
        .select('*')
        .eq('entry_id', entry.id)
        .eq('locale', locale)
        .eq('status', 'published')
        .maybeSingle();
      if (trError) return { data: null, error: toDbError(trError) };
      if (!translation) return { data: null, error: null };

      const result: CodexPublishedEntry = {
        entry: entry as CodexEntry,
        translation: translation as CodexEntryTranslation,
      };
      return { data: result, error: null };
    },

    async listPublishedEntryTranslations(locale) {
      const { data, error } = await client
        .from('codex_entry_translations')
        .select('*, codex_entries!inner(category_id, slug)')
        .eq('locale', locale)
        .eq('status', 'published');
      if (error) return { data: [], error: toDbError(error) };

      const rows = (data ?? []).map((row) => {
        const { codex_entries, ...rest } = row as CodexEntryTranslation & {
          codex_entries: { category_id: string | null; slug: string };
        };
        return { ...rest, category_id: codex_entries.category_id, slug: codex_entries.slug };
      });
      return { data: rows, error: null };
    },

    async searchEntries(locale, query, limit = 20) {
      const trimmed = query.trim();
      const escaped = trimmed.replace(/[%_]/g, (m) => `\\${m}`);

      // slug挪到entries表之后，"标题匹配"和"路径标识匹配"不再是同一行的两个
      // 列，没法用一次.or()查完——分两次查（一次按标题、一次按entries.slug），
      // 按entry_id去重合并，两边都尊重同一份"这个语言+已发布"的过滤条件。
      let byTitle = client
        .from('codex_entry_translations')
        .select('entry_id, title, codex_entries!inner(slug)')
        .eq('locale', locale)
        .eq('status', 'published')
        .limit(limit);
      if (trimmed) byTitle = byTitle.ilike('title', `%${escaped}%`);

      let bySlug = client
        .from('codex_entries')
        .select('id, slug, codex_entry_translations!inner(title, locale, status)')
        .eq('codex_entry_translations.locale', locale)
        .eq('codex_entry_translations.status', 'published')
        .limit(limit);
      if (trimmed) bySlug = bySlug.ilike('slug', `%${escaped}%`);

      const [{ data: titleRows, error: titleError }, { data: slugRows, error: slugError }] = await Promise.all([
        byTitle,
        bySlug,
      ]);
      if (titleError) return { data: [], error: toDbError(titleError) };
      if (slugError) return { data: [], error: toDbError(slugError) };

      const results = new Map<string, CodexEntrySearchResult>();
      for (const row of titleRows ?? []) {
        const r = row as unknown as { entry_id: string; title: string; codex_entries: { slug: string } };
        results.set(r.entry_id, { id: r.entry_id, title: r.title, slug: r.codex_entries.slug });
      }
      for (const row of slugRows ?? []) {
        const r = row as unknown as {
          id: string;
          slug: string;
          codex_entry_translations: { title: string }[];
        };
        if (results.has(r.id)) continue;
        const title = r.codex_entry_translations?.[0]?.title;
        if (title) results.set(r.id, { id: r.id, title, slug: r.slug });
      }

      return { data: [...results.values()].slice(0, limit), error: null };
    },

    async listCitations(entryTranslationId) {
      const { data, error } = await client
        .from('codex_citations')
        .select('*')
        .eq('entry_translation_id', entryTranslationId)
        .order('order_index', { ascending: true });
      return { data: (data ?? []) as CodexCitation[], error: toDbError(error) };
    },

    async replaceCitations(entryTranslationId, citations) {
      const { error: deleteError } = await client
        .from('codex_citations')
        .delete()
        .eq('entry_translation_id', entryTranslationId);
      if (deleteError) return { error: toDbError(deleteError) };

      if (citations.length === 0) return { error: null };

      const rows = citations.map((c, index) => ({
        entry_translation_id: entryTranslationId,
        order_index: index + 1,
        title: c.title,
        url: c.url,
      }));
      const { error: insertError } = await client.from('codex_citations').insert(rows);
      return { error: toDbError(insertError) };
    },

    async getScopesForAdmin(adminId) {
      // 调用方（requireCodexAdmin）已经确认过这个人存在于 public.admin 表里，
      // 这里只负责"他在内容库这边具体能管哪些分类"——一行都没有＝超级管理员。
      const { data: scopeRows, error: scopeError } = await client
        .from('codex_admin_scopes')
        .select('category_id')
        .eq('admin_id', adminId);
      if (scopeError) return { data: null, error: toDbError(scopeError) };

      const scopedCategoryIds =
        scopeRows && scopeRows.length > 0 ? scopeRows.map((r) => r.category_id as string) : null;
      const info: CodexAdminScopeInfo = { scopedCategoryIds };
      return { data: info, error: null };
    },
  } satisfies CodexRepository;
}

export type { CodexEntryStatus };
