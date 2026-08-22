import type { MetadataRoute } from 'next';
import { codexRepository } from '@/lib/codex/adminClient';
import { buildBreadcrumb } from '@/lib/codex/categoryTree';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindo-gold.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: categories }, { data: categoryTranslations }] = await Promise.all([
    codexRepository.listCategories(),
    codexRepository.listCategoryTranslations(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    const { data: translations } = await codexRepository.listPublishedEntryTranslations(locale);
    for (const translation of translations) {
      const breadcrumb = buildBreadcrumb(translation.category_id, categories, categoryTranslations, locale);
      const path = [...breadcrumb.map((b) => b.slug), translation.slug].join('/');
      entries.push({
        url: `${SITE_URL}/${locale}/codex/${path}`,
        lastModified: translation.updated_at,
      });
    }
  }

  return entries;
}
