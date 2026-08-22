import type { NextRequest } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { buildBreadcrumb } from '@/lib/codex/categoryTree';
import { extractPlainText } from '@/lib/codex/tiptapUtils';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindo-gold.vercel.app';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? routing.defaultLocale;

  const [{ data: categories }, { data: categoryTranslations }, { data: translations }] = await Promise.all([
    codexRepository.listCategories(),
    codexRepository.listCategoryTranslations(),
    codexRepository.listPublishedEntryTranslations(lang),
  ]);

  const sections = translations.map((t) => {
    const breadcrumb = buildBreadcrumb(t.category_id, categories, categoryTranslations, lang);
    const path = [...breadcrumb.map((b) => b.slug), t.slug].join('/');
    const text = extractPlainText(t.body as never);
    return `# ${t.title}\n\nURL: ${SITE_URL}/${lang}/codex/${path}\n\n${text}`;
  });

  return new Response(sections.join('\n\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
