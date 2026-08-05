import type { NextRequest } from 'next/server';
import { llms } from 'fumadocs-core/source';
import { codexSourceLoader } from '@/lib/source';
import { routing } from '@/i18n/routing';

const generator = llms(codexSourceLoader);

export function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? routing.defaultLocale;

  return new Response(generator.index(lang), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
