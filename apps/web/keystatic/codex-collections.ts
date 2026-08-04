import { fields, collection } from '@keystatic/core';
import { codexContentComponents } from './codex-content-components';
import { LOCALES, LOCALE_LABELS, localeToKey } from './locales';

/**
 * content/codex/ 里每个词条一个文件夹，内含9个语言文件（en.mdx/zh.mdx/...），
 * 每个语言文件各自独立带 frontmatter（title）+ 正文，见 Mindo-内容库.md 5.1节。
 *
 * Keystatic 的 format.contentField 只能把"一份 frontmatter + 一份正文"合并进同一个文件，
 * 一个 collection 只能有一个这样的字段。要让9个语言文件都各自保留独立 frontmatter，
 * 唯一匹配的方式是"一个语言 = 一个 collection"，用 path 的字面量后缀锁定文件名
 * （如 `content/codex/**​/zh` → `content/codex/{词条路径}/zh.mdx`），
 * 9个 collection 各自独立读写自己那个语言文件，互不干扰。
 *
 * slugField 直接复用 title 字段（fields.slug 的标准用法：name 部分对应 frontmatter 里的
 * title 文本，slug 部分对应文件夹路径），这样磁盘上的 frontmatter 形状跟现有文件完全一致
 * （只有 title 一个 key），不会因为接入 Keystatic 而多出额外字段。
 *
 * 已知风险：slugField 允许在编辑器里修改"词条路径标识"，一旦修改会把这个语言的文件
 * 挪到新文件夹，但其他8个语言的文件不会跟着挪，导致9个语言文件对不上。
 * 字段描述里已加中文警告，但 Keystatic 本身不提供"禁止改slug"的开关。
 */
function buildCodexEntryCollection(locale: string) {
  return collection({
    label: `词条 · ${LOCALE_LABELS[locale] ?? locale}`,
    path: `content/codex/**/${locale}`,
    format: { contentField: 'content' },
    entryLayout: 'content',
    slugField: 'title',
    schema: {
      title: fields.slug({
        name: {
          label: '标题',
          description: '这个词条在当前语言下显示的标题',
        },
        slug: {
          label: '词条路径标识 —— 请勿修改',
          description:
            '对应磁盘上的文件夹路径，9种语言必须共用同一个路径。改了这里，这个语言的文件会被移动到新文件夹，但其他语言不会跟着移动，导致9个语言文件从此对不上号。',
        },
      }),
      content: fields.mdx({
        label: '正文',
        components: codexContentComponents,
      }),
    },
  });
}

/**
 * 分类/主题文件夹的 meta.json（china/、china/bazi/、china/bazi/wuxing/ 等每一层都有一份）。
 * 字段沿用 fumadocs 原生 metaSchema 里本项目实际用到的两个：title、pages。
 * 同样用 slugField 复用 title，避免多出额外字段；同样存在"改slug=挪分类文件夹"的风险。
 */
const codexMetaCollection = collection({
  label: '词条分类（meta.json）',
  path: 'content/codex/**/meta',
  format: { data: 'json' },
  slugField: 'title',
  schema: {
    title: fields.slug({
      name: { label: '分类中文名' },
      slug: {
        label: '分类路径标识 —— 请勿修改',
        description: '对应磁盘上的文件夹路径，改了这里会把整个分类文件夹挪走，其下所有词条一起受影响。',
      },
    }),
    pages: fields.array(
      fields.text({ label: '子项（文件夹名）' }),
      {
        label: '子项显示顺序',
        description: '每一行是一个子文件夹名，决定该分类下词条/子分类的展示顺序',
        itemLabel: (props) => (typeof props.value === 'string' && props.value) || '（空）',
      }
    ),
  },
});

export const codexCollections: Record<string, any> = {};
for (const locale of LOCALES) {
  codexCollections[`codexEntry_${localeToKey(locale)}`] = buildCodexEntryCollection(locale);
}
codexCollections.codexMeta = codexMetaCollection;

export const codexNavigationKeys = [
  ...LOCALES.map((locale) => `codexEntry_${localeToKey(locale)}`),
  'codexMeta',
];
