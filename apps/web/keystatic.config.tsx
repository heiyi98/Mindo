import { config } from '@keystatic/core';
import { codexCollections, codexNavigationKeys } from './keystatic/codex-collections';
import { messagesSingletons, messagesNavigationGroups } from './keystatic/messages-collections';

// 只在开发环境暴露后台，生产环境（Vercel等）里 /keystatic 和 /api/keystatic 一律404。
// 见 apps/web/src/app/keystatic/layout.tsx 和 apps/web/src/app/api/keystatic/[...params]/route.ts。
export const showAdminUI = process.env.NODE_ENV === 'development';

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'Mindo 内容后台' },
    navigation: {
      '词条内容（Codex）': codexNavigationKeys,
      ...messagesNavigationGroups,
    },
  },
  collections: {
    ...codexCollections,
  },
  singletons: {
    ...messagesSingletons,
  },
});
