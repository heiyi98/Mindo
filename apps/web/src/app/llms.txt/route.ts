import type { NextRequest } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { buildBreadcrumb } from '@/lib/codex/categoryTree';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindo-gold.vercel.app';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? routing.defaultLocale;

  const [{ data: categories }, { data: categoryTranslations }, { data: translations }] = await Promise.all([
    codexRepository.listCategories(),
    codexRepository.listCategoryTranslations(),
    codexRepository.listPublishedEntryTranslations(lang),
  ]);

  const lines = translations.map((t) => {
    const breadcrumb = buildBreadcrumb(t.category_id, categories, categoryTranslations, lang);
    const path = [...breadcrumb.map((b) => b.slug), t.slug].join('/');
    return `- [${t.title}](${SITE_URL}/${lang}/codex/${path})`;
  });

  const body = `# Mindo Codex (${lang})\n\n${lines.join('\n')}\n`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
