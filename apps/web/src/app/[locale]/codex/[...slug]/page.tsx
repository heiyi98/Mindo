import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { buildBreadcrumb, resolveCategoryByPath } from '@/lib/codex/categoryTree';
import { TiptapDocument, CitationsFooter, type XrefTarget } from '@/components/codex/TiptapRenderer';
import { LanguageSwitcher } from '@/components/os/LanguageSwitcher';
import Link from 'next/link';
import type { CodexEntryTranslation } from '@mindo/db';

async function resolveXrefMap(
  body: Record<string, unknown>,
  locale: string
): Promise<Map<string, XrefTarget>> {
  const targetIds = new Set<string>();
  function walk(node: any) {
    if (node?.type === 'xref' && typeof node.attrs?.targetEntryId === 'string') {
      targetIds.add(node.attrs.targetEntryId);
    }
    node?.content?.forEach(walk);
  }
  walk(body);

  if (targetIds.size === 0) return new Map();

  // slug现在挂在词条本身（codex_entries），标题还是分语言的
  // （codex_entry_translations）——两处各取一半拼起来。
  const [{ data: translations }, { data: targetEntries }] = await Promise.all([
    codexRepository.listEntryTranslationsForEntries([...targetIds]),
    codexRepository.listEntriesByIds([...targetIds]),
  ]);
  const slugByEntryId = new Map(targetEntries.map((e) => [e.id, e.slug]));
  const map = new Map<string, XrefTarget>();
  for (const t of translations) {
    if (t.locale !== locale) continue;
    const slug = slugByEntryId.get(t.entry_id);
    if (!slug) continue;
    map.set(t.entry_id, { title: t.title, url: `/${locale}/codex/${slug}` });
  }
  return map;
}

function Breadcrumb({
  items,
  locale,
  homeLabel,
}: {
  items: { name: string; slug: string }[];
  locale: string;
  homeLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
      <Link href={`/${locale}/codex`}>{homeLabel}</Link>
      {items.map((item, i) => (
        <span key={i}>
          {' / '}
          <span>{item.name}</span>
        </span>
      ))}
    </nav>
  );
}

export default async function CodexPage({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const { locale, slug } = await params;
  if (!slug || slug.length === 0) notFound();

  const lastSegment = slug[slug.length - 1];

  const { data: published } = await codexRepository.getPublishedEntryBySlug(locale, lastSegment);

  const [{ data: categories }, { data: categoryTranslations }] = await Promise.all([
    codexRepository.listCategories(),
    codexRepository.listCategoryTranslations(),
  ]);

  let translation: CodexEntryTranslation | null = null;
  let categoryId: string | null = null;
  let breadcrumbItems: { name: string; slug: string }[] = [];

  if (published) {
    translation = published.translation;
    categoryId = published.entry.category_id;
    breadcrumbItems = buildBreadcrumb(categoryId, categories, categoryTranslations, locale).slice(0, -1);
  } else {
    // 按最后一段查不到已发布词条，退回去按完整路径匹配分类，看这个分类有没有
    // 设置"归类首页"（home_entry_id）。
    const category = resolveCategoryByPath(slug, categories, categoryTranslations, locale);
    if (!category?.home_entry_id) notFound();

    const { data: homeTranslations } = await codexRepository.getEntryTranslations(category.home_entry_id);
    const homeTranslation = homeTranslations.find((t) => t.locale === locale && t.status === 'published');
    if (!homeTranslation) notFound();

    translation = homeTranslation;
    categoryId = category.id;
    breadcrumbItems = buildBreadcrumb(category.id, categories, categoryTranslations, locale);
  }

  const [xrefMap, { data: citations }] = await Promise.all([
    resolveXrefMap(translation.body, locale),
    codexRepository.listCitations(translation.id),
  ]);
  const t = await getTranslations('codex');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <LanguageSwitcher />
      <Breadcrumb items={breadcrumbItems} locale={locale} homeLabel={t('home')} />
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{translation.title}</h1>
      <article>
        <TiptapDocument doc={translation.body as never} xrefMap={xrefMap} />
      </article>
      <CitationsFooter citations={citations} title={t('referencesTitle')} />
    </div>
  );
}
