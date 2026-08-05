import type { NextRequest } from 'next/server';
import { codexSourceLoader } from '@/lib/source';
import { routing } from '@/i18n/routing';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? routing.defaultLocale;
  const pages = codexSourceLoader.getPages(lang);

  const sections = await Promise.all(
    pages.map(async (page) => {
      const raw = await page.data.getText('raw');
      const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
      return `# ${page.data.title}\n\nURL: ${page.url}\n\n${body}`;
    })
  );

  return new Response(sections.join('\n\n---\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
