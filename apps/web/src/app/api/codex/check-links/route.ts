import { codexSourceLoader } from '@/lib/source';

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;

/**
 * 内容库内部链接校验。fumadocs-mdx 的 macro collection 只能在 Next 的 webpack/turbopack
 * 构建流程里解析，没法在独立 Node 脚本里直接 import（试过 fumadocs-mdx/node 的 register()
 * 配 tsx，两者的模块钩子会冲突），所以校验逻辑放在这个内部 API 路由里，
 * 复用 dev/build 时已经跑起来的 codexSourceLoader。
 *
 * 用法：pnpm dev 跑起来后访问 /api/codex/check-links，返回死链列表（JSON）。
 */
export async function GET() {
  const broken: { language: string; file: string; href: string }[] = [];

  for (const { language, pages } of codexSourceLoader.getLanguages()) {
    for (const page of pages) {
      const raw = await page.data.getText('raw');
      const dir = page.path.split('/').slice(0, -1).join('/');

      for (const match of raw.matchAll(LINK_RE)) {
        const href = match[1];
        if (/^([a-z]+:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:')) {
          continue;
        }

        const resolved = codexSourceLoader.getPageByHref(href, { language, dir });
        if (!resolved) {
          broken.push({ language, file: page.path, href });
        }
      }
    }
  }

  return Response.json({ brokenCount: broken.length, broken });
}
