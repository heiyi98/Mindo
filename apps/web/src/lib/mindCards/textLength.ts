// 留言字数上限校验：不能用最简单的字符串长度（.length）去数，某些复杂的emoji
// （比如带ZWJ连接符的组合emoji）背后其实是好几个Unicode码位拼起来的，直接用
// .length会把这种emoji数成2个甚至更多字符，跟用户直觉不符。用Intl.Segmenter
// 按"字形簇"（用户感知里的"一个字符"）来数，更准确；如果运行环境不支持
// Intl.Segmenter（理论上现代Node/浏览器都支持），退回到相对更准确的
// Array.from写法兜底。
export function countGraphemes(text: string): number {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).length;
  }
  return Array.from(text).length;
}

// 按"字形簇"（用户感知里的"一个字符"）截取前N个，不用最简单的字符串
// 截取方式——那样容易把一个复杂emoji从中间切断，变成两个乱码符号。
export function truncateToGraphemes(text: string, maxLength: number): string {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(text), (s) => s.segment);
    return segments.slice(0, maxLength).join('');
  }
  return Array.from(text).slice(0, maxLength).join('');
}

export const MIND_CARD_COMMENT_MAX_LENGTH = 150;