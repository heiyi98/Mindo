'use client';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { MindCardStyleV2, MindCardRun } from '@/lib/mindCards/style';
import { DEFAULT_MIND_CARD_CARD_STYLE } from '@/lib/mindCards/style';
import { getCardWrapperStyle, getCardPaddedFlexStyle, getCardTextStyle, getFadeEdge } from '@/lib/mindCards/cardStyleCss';

interface MindCardBodyProps {
  style: MindCardStyleV2 | null;
  className?: string;
  // true=浏览态小卡片：固定裁切+触碰无限排列时渐隐；false（默认）=展开态：不裁切，完整显示
  clipped?: boolean;
  onClick?: () => void;
}

function RunSpan({ run }: { run: MindCardRun }) {
  const spanStyle: CSSProperties = {
    fontWeight: run.bold ? 700 : undefined,
    fontStyle: run.italic ? 'italic' : undefined,
    textDecoration: run.underline ? 'underline' : undefined,
    color: run.color || undefined,
    backgroundColor: run.backgroundColor || undefined,
  };
  return <span style={spanStyle}>{run.text}</span>;
}

const FADE_MASK: Record<'bottom' | 'left' | 'right', string> = {
  bottom: 'linear-gradient(to bottom, black 78%, transparent 100%)',
  right: 'linear-gradient(to right, black 78%, transparent 100%)',
  left: 'linear-gradient(to left, black 78%, transparent 100%)',
};

export default function MindCardBody({ style, className, clipped = false, onClick }: MindCardBodyProps) {
  // 按字段各自兜底，不是按整个style对象兜底：老数据里有 style 列非NULL但内容是
  // 残缺/空对象（{}）的历史遗留行，只判断"style整体是否为null"接不住这种情况——
  // 空对象是truthy，会跳过顶层的 ?? 兜底，进而让 card/runs 双双变成 undefined。
  const card = style?.card ?? DEFAULT_MIND_CARD_CARD_STYLE;
  const runs = style?.runs ?? [];
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const contentSignature = runs.map((r) => r.text).join('');

  // 判断是否触碰了无限排列：横排比较高度是否溢出容器，竖排比较宽度是否溢出容器。
  // 只在浏览态(clipped=true)才需要判断——展开态本来就不裁切，不存在"溢出"这回事。
  useLayoutEffect(() => {
    if (!clipped) {
      setOverflowing(false);
      return;
    }
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const check = () => {
      if (card.vertical) {
        setOverflowing(text.scrollWidth > container.clientWidth + 1);
      } else {
        setOverflowing(text.scrollHeight > container.clientHeight + 1);
      }
    };
    check();

    const ro = new ResizeObserver(check);
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipped, card.vertical, card.align, card.fontSize, contentSignature]);

  const fadeEdge = getFadeEdge(card);
  const wrapperStyle = getCardWrapperStyle(card);
  const paddedStyle = getCardPaddedFlexStyle(card);
  const textStyle = getCardTextStyle(card);

  return (
    <div style={wrapperStyle} className={className} onClick={onClick}>
      <div
        ref={containerRef}
        style={{ ...paddedStyle, ...(clipped ? { overflow: 'hidden' } : {}) }}
      >
        <p
          ref={textRef}
          style={{
            ...textStyle,
            ...(clipped && overflowing
              ? { maskImage: FADE_MASK[fadeEdge], WebkitMaskImage: FADE_MASK[fadeEdge] }
              : {}),
          }}
        >
          {runs.map((run, i) => (
            <RunSpan key={i} run={run} />
          ))}
        </p>
      </div>
    </div>
  );
}