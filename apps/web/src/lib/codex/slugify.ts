// 根据标题生成一个建议用的slug——只是给"新建词条/分类"表单一个起点，写手可以
// 随时改。中文/日文/韩文这类标题本身没有天然的罗马化写法，硬翻译容易出错，
// 干脆生成一个短随机后缀兜底，不假装能读懂标题在说什么。
export function slugifySuggestion(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base) return base;

  return `entry-${Math.random().toString(36).slice(2, 8)}`;
}
