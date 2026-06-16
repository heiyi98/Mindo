import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'zh-Hant', 'fr', 'es', 'ja', 'ko', 'it', 'de'],
  defaultLocale: 'en'
});
