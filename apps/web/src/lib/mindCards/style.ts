export type MindCardFontSizeTier = 1 | 2 | 3 | 4 | 5;
export type LangGroupKey = 'latin' | 'sc' | 'tc' | 'jp' | 'kr';
export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'center' | 'bottom';
export type MindCardBackgroundColor = '#000000' | '#FFFFFF';

export const MIND_CARD_TEXT_COLORS = [
  '#000000', '#FF3B30', '#FF9500', '#34C759',
  '#007AFF', '#AF52DE', '#FF2D55', '#FFFFFF',
] as const;
export type MindCardTextColor = typeof MIND_CARD_TEXT_COLORS[number];

// 整卡片字体选择：latin/kr各自独立选择；cjkChain是简中/繁中/日文三者的完整渲染优先级顺序
// （由用户点击的那个字体，在fontCatalog里独立写死的relatedChain直接带出，含自己在内）。
// 三个字段都缺失=完全没手动选过，渲染时整体走SERIF_FALLBACK衬线兜底。
export interface MindCardFontFamilySelection {
  latin?: string;
  cjkChain?: string[];
  kr?: string;
}

// 整卡片层：始终整张卡片统一，不随选区变化
export interface MindCardCardStyle {
  fontSize: MindCardFontSizeTier;
  fontFamily: MindCardFontFamilySelection;
  vertical: boolean; // 横排/竖排
  align: HorizontalAlign;
  valign: VerticalAlign;
  backgroundColor: MindCardBackgroundColor;
}

// 选区层：带样式标记的文字片段数组，拼接所有run.text等于卡片纯文本内容。
// 一个硬换行单独成一个run，text为'\n'，其余字段都不设。
// 字体不是选区级属性（已改回整卡片层，见MindCardCardStyle.fontFamily）。
export interface MindCardRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
}

export interface MindCardStyleV2 {
  card: MindCardCardStyle;
  runs: MindCardRun[];
}

export const DEFAULT_MIND_CARD_CARD_STYLE: MindCardCardStyle = {
  fontSize: 3,
  fontFamily: {},
  vertical: false,
  align: 'center',
  valign: 'center',
  // 空字符串这个已经废弃的默认值不能再用了（类型已经不允许），改成白色。
  // 这只影响"卡片还没被用户自己选过颜色之前，摆出来长什么样"这一种边缘
  // 情况，不影响任何已经存在、用户自己选过黑或白的卡片。
  backgroundColor: '#FFFFFF',
};

export const DEFAULT_MIND_CARD_STYLE: MindCardStyleV2 = {
  card: DEFAULT_MIND_CARD_CARD_STYLE,
  runs: [],
};

export function runsToPlainText(runs: MindCardRun[]): string {
  return runs.map((r) => r.text).join('');
}