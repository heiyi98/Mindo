import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'fr', 'es', 'ja', 'ko', 'it', 'de'],
  defaultLocale: 'en'
});
