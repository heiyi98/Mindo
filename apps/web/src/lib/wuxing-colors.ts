// 五行颜色 —— 单一真相
// 数值来自 BaziChartCard.tsx 原有的 ELEMENT_COLORS，与 CLAUDE.md
// "五行颜色规范"一致。所有需要五行取色的组件都应该从这里导入，
// 不要各自再定义一份。

export type Wuxing = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export const WUXING_COLORS: Record<Wuxing, string> = {
  Wood: '#388E3C',
  Fire: '#D32F2F',
  Earth: '#F57F17',
  Metal: '#757575',
  Water: '#1976D2',
};

// 五行缺失/未知时的兜底色（对应原 ELEMENT_COLORS 里的 'gray' key）
export const WUXING_FALLBACK_COLOR = '#6b7280';

/**
 * 按五行取颜色，wuxing 为空或不认识的值时回退到兜底色。
 * 用法：getWuxingColor(dayStemNode?.wuxing)
 */
export function getWuxingColor(wuxing: string | undefined | null): string {
  if (!wuxing) return WUXING_FALLBACK_COLOR;
  return WUXING_COLORS[wuxing as Wuxing] ?? WUXING_FALLBACK_COLOR;
}
