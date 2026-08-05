// 内容库（Codex）主题注册表。
// 只是路由内部判断"这个 slug 属不属于哪个主题"用的数据，不驱动任何面向用户的动态生成——
// 根首页的图谱/卡片是手写 JSX，不读这份表、不做 .map() 循环。
export interface CodexTopic {
  id: string;
  /** 主题下所有词条共同的 slug 前缀 */
  slugPrefix: string[];
  /** 主题首页自身的 slug（当前就是 slugPrefix 本身） */
  homeSlug: string[];
  /** 词条清单页的 slug */
  directorySlug: string[];
  /** 喂给搜索索引的 tag，用于把搜索范围限定在本主题内 */
  searchTag: string;
}

export const CODEX_TOPICS: CodexTopic[] = [
  {
    id: 'bazi',
    slugPrefix: ['china', 'bazi'],
    homeSlug: ['china', 'bazi'],
    directorySlug: ['china', 'bazi', 'directory'],
    searchTag: 'china/bazi',
  },
];

function slugStartsWith(slug: string[], prefix: string[]): boolean {
  return prefix.length <= slug.length && prefix.every((seg, i) => slug[i] === seg);
}

function slugEquals(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((seg, i) => seg === b[i]);
}

export function getCodexTopicForSlug(slug: string[]): CodexTopic | undefined {
  return CODEX_TOPICS.find((topic) => slugStartsWith(slug, topic.slugPrefix));
}

export function isCodexTopicHome(topic: CodexTopic, slug: string[]): boolean {
  return slugEquals(slug, topic.homeSlug);
}

export function isCodexTopicDirectory(topic: CodexTopic, slug: string[]): boolean {
  return slugEquals(slug, topic.directorySlug);
}
