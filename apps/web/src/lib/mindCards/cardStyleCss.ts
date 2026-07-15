import type { CSSProperties } from 'react';
import type { MindCardCardStyle, MindCardFontSizeTier } from './style';
import { resolveCardFontFamilyCss } from './fontCatalog';

export const MIND_CARD_FONT_SIZE_PX: Record<MindCardFontSizeTier, number> = {
  1: 12,
  2: 15,
  3: 18,
  4: 22,
  5: 26,
};

const H_ALIGN_JUSTIFY: Record<MindCardCardStyle['align'], CSSProperties['justifyContent']> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

const V_ALIGN_ITEMS: Record<MindCardCardStyle['valign'], CSSProperties['alignItems']> = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
};

// Word默认页边距约12%，卡片是短句场景不是密集阅读文档，收紧到10%更适合"留白感"的调性
const CARD_PADDING_PCT = 10;

// 最外层：只负责背景色和整体尺寸
export function getCardWrapperStyle(card: MindCardCardStyle): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    backgroundColor: card.backgroundColor || 'hsl(var(--card))',
  };
}

// 留白+对齐层：普通、非contenteditable的div专用（MindCardBody的展示层、
// RichTextComposer里包裹EditorContent的中间层，两处共用同一套逻辑，不再分裂成两套）。
// flex只允许出现在这一层，绝不允许直接加在.ProseMirror（contenteditable元素）本体上——
// 多个浏览器对"可编辑元素本身是flex容器"支持不稳定，曾直接导致完全无法输入。
export function getCardPaddedFlexStyle(card: MindCardCardStyle): CSSProperties {
  return {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: `${CARD_PADDING_PCT}%`,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: H_ALIGN_JUSTIFY[card.align],
    alignItems: V_ALIGN_ITEMS[card.valign],
  };
}

// 竖排书写方向绑定对齐语义：左对齐=vertical-lr（第一列固定左边，越写越往右长），
// 右对齐=vertical-rl（第一列固定右边，越写越往左长），居中沿用vertical-rl作为默认生长方向。
function getWritingMode(card: MindCardCardStyle): CSSProperties['writingMode'] {
  if (!card.vertical) return 'horizontal-tb';
  return card.align === 'left' ? 'vertical-lr' : 'vertical-rl';
}

// 文字本体样式：字体/字号/书写方向，不含任何flex/padding。横排时补width:100%+textAlign
// （撑满留白层里刨去padding后的可用宽度）；竖排时不设width，按内容自然收缩，靠外层
// getCardPaddedFlexStyle的justifyContent/alignItems定位。用于.ProseMirror本体
// （通过useEffect直接设置DOM style）和MindCardBody的<p>。
export function getCardTextStyle(card: MindCardCardStyle): CSSProperties {
  const vertical = card.vertical;
  return {
    fontSize: MIND_CARD_FONT_SIZE_PX[card.fontSize],
    color: 'hsl(var(--foreground))',
    writingMode: getWritingMode(card),
    // 竖排时，拉丁字母/数字默认会整体侧躺90度嵌入竖排文字流（阅读时需要歪头）。
    // 片语的竖排主要服务东亚用户，对拉丁字母的竖排阅读习惯不敏感，改用upright让
    // 每个字母/数字各自正立、按顺序往下堆叠，不需要歪头，跟中日文字的竖排习惯更统一。
    textOrientation: vertical ? 'upright' : undefined,
    fontFamily: resolveCardFontFamilyCss(card.fontFamily),
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...(vertical ? {} : { width: '100%', textAlign: card.align }),
  };
}

// 浏览态溢出渐隐的方向：横排永远渐隐底部（内容只会向下长）；竖排根据实际生长方向
// （由对齐决定）渐隐对应一侧。
export function getFadeEdge(card: MindCardCardStyle): 'bottom' | 'left' | 'right' {
  if (!card.vertical) return 'bottom';
  return card.align === 'left' ? 'right' : 'left';
}