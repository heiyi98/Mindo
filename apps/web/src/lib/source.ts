import { loader, update } from 'fumadocs-core/source';
import { defineI18n } from 'fumadocs-core/i18n';
import { defineDocs } from 'fumadocs-mdx/macro';
import { routing } from '@/i18n/routing';

const codex = defineDocs({
  dir: 'content/codex',
});

export const codexI18n = defineI18n({
  languages: [...routing.locales],
  defaultLanguage: routing.defaultLocale,
  parser: 'dir',
});

/**
 * content/codex 里每个词条一个文件夹，语言文件直接叫 `{locale}.mdx`（如 zh.mdx、en.mdx），
 * 这是内容团队定下的目录约定（见 Mindo-内容库.md 5.1 节）。
 * 但 fumadocs-core 内置的 `dir` 语言解析要求 locale 是路径最前面一段（`{locale}/rest.mdx`）。
 * 这里在喂给 loader() 之前，把 locale 从"文件名"挪到"路径最前面"，
 * 磁盘上的目录结构完全不受影响，纯粹是数据层的适配。
 *
 * meta.json 不区分语言，用 fumadocs 的 "$" 通配 locale 段，让同一份 meta.json
 * 在每个语言的 page tree 里都生效。
 */
function remapForDirParser<T extends { type: 'page' | 'meta'; path: string }>(files: T[]): T[] {
  return files.map((file) => {
    const segs = file.path.split('/');
    const filename = segs.pop();
    if (!filename) return file;

    const dot = filename.lastIndexOf('.');
    const base = filename.slice(0, dot);
    const ext = filename.slice(dot + 1);

    if (file.type === 'meta') {
      return { ...file, path: ['$', ...segs, filename].join('/') };
    }

    return { ...file, path: [base, ...segs].join('/') + '.' + ext };
  });
}

const codexSource = update(codex.toFumadocsSource()).files(remapForDirParser).build();

export const codexSourceLoader = loader({
  baseUrl: '/codex',
  source: codexSource,
  i18n: codexI18n,
});

/**
 * 页面数据 -> 前端展示结构的转换层（空壳，本次不实现任何重排逻辑）。
 *
 * 用途：未来如需让前端展示的分类结构脱离实际文件夹位置
 * （例如某词条物理上存放于A分类下，但需在前端显示于B分类下），
 * 在此函数中实现映射规则。本次直接透传 loader 生成的 page tree，不做任何改写。
 */
export function getDisplayTree(locale: string) {
  return codexSourceLoader.getPageTree(locale);
}
