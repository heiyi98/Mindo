import { config } from '@keystatic/core';
import { codexCollections, codexNavigationKeys } from './keystatic/codex-collections';

// 只在开发环境暴露后台，生产环境（Vercel等）里 /keystatic 和 /api/keystatic 一律404。
// 见 apps/web/src/app/keystatic/layout.tsx 和 apps/web/src/app/api/keystatic/[...params]/route.ts。
export const showAdminUI = process.env.NODE_ENV === 'development';

// 翻译词典（messages/）已从 Keystatic 撤出，不再接入编辑后台，见 Mindo-内容库.md 第十一节。
// 只剩内容库（content/codex/）。配套地，API路由那边把 localBaseDirectory 收窄到
// content/codex 目录本身，Keystatic 的本地模式扫描不会再碰 src/、public/、messages/ 这些无关目录。
export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'Mindo 内容后台' },
    navigation: {
      '词条内容（Codex）': codexNavigationKeys,
    },
  },
  collections: {
    ...codexCollections,
  },
});
