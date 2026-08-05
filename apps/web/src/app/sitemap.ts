import type { MetadataRoute } from 'next';
import { codexSourceLoader } from '@/lib/source';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindo-web.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const { pages } of codexSourceLoader.getLanguages()) {
    for (const page of pages) {
      entries.push({ url: `${SITE_URL}${page.url}` });
    }
  }

  return entries;
}
