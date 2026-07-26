'use client';
import { forwardRef, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { MindCardStyleV2, MindCardRun } from '@/lib/mindCards/style';
import { DEFAULT_MIND_CARD_CARD_STYLE } from '@/lib/mindCards/style';
import { getCardWrapperStyle, getCardPaddedFlexStyle, getCardTextStyle, getFadeEdge } from '@/lib/mindCards/cardStyleCss';

interface MindCardBodyProps {
  style: MindCardStyleV2 | null;
  className?: string;
  // true=浏览态小卡片：固定裁切+触碰无限排列时渐隐；false（默认）=展开态：不裁切，完整显示
  clipped?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  // true=让卡片跟着内容生长（横排：高度auto撑开；竖排：宽度fit-content撑开），
  // 用于详情视图；默认false保持原有行为（100%填满父容器），浏览态缩略图/编辑
  // 预览等既有调用方不传这个prop，完全不受影响。
  grow?: boolean;
  // 外部传入的CSS覆盖（边框/圆角/固定轴的尺寸上下限等），合并在最外层div上，
  // 命名成frameStyle是为了不跟上面已有的style prop（卡片内容样式数据）撞名
  frameStyle?: CSSProperties;
  // 叠加在卡片内部的自定义内容（比如收藏/留言/分享这条按钮栏），作为最外层div的
  // 一个普通子节点渲染，具体怎么定位（贴底/貼右上角等）由调用方自己在传进来的
  // 节点上写好绝对定位样式。最外层div固定给position:relative作为定位基准，
  // 浏览态小卡片和详情弹窗共用同一套机制，不需要分别设计各自的叠加方案。
  overlay?: ReactNode;
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

const MindCardBody = forwardRef<HTMLDivElement, MindCardBodyProps>(function MindCardBody(
  { style, className, clipped = false, onClick, grow = false, frameStyle, overlay },
  ref,
) {
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

  // grow模式：写法完全照抄RichTextComposer.tsx里getComposerCanvasStyle配套的
  // 现成实现，不是自己另外设计的——参考文件里外层卡片的className固定带着
  // "flex flex-col"（不分横竖排，两种情况都这么写），内层留白层固定多加一句
  // flex:1（也不分横竖排，统一加）；唯一按横竖排区分的，只有"外层到底是
  // height:auto还是width:fit-content"这一处。这里保持同样的分工，其余原有的
  // width/height设置一律不删不改，只在原有基础上追加。
  //
  // 重要更正：这行flex:1曾经被错误地删除过，理由是"会把留白层高度锁死、导致
  // 内容超出也长不大"——这个判断是没有经过真实验证、单凭理论推演做出的，是错的。
  // 真正导致"发布后内容消失"的原因只有docToRuns只读第一段这一个数据丢失bug，
  // 已经修复；flex:1本身其实是必需的：外层容器（wrapper）是display:flex+
  // flexDirection:column+height:auto+minHeight兜底（minHeight来自调用方传入的
  // frameStyle），留白层用flex:1，才能在内容较少时被撑满到minHeight这个下限，
  // alignItems（垂直居中/置顶/置底）才有多余空间可以真正起作用；内容超出
  // minHeight时，flex:1不会限制它继续跟着外层一起长大——这是编辑画布里已经
  // 验证生效的同一套机制，删掉这行会导致"垂直居中"效果失真（退化成贴顶）。
  if (grow) {
    wrapperStyle.display = 'flex';
    wrapperStyle.flexDirection = 'column';
    paddedStyle.flex = 1;
    if (card.vertical) {
      wrapperStyle.width = 'fit-content';
    } else {
      wrapperStyle.height = 'auto';
    }
  }

  return (
    <div
      ref={ref}
      style={{ position: 'relative', ...wrapperStyle, ...frameStyle }}
      className={className}
      onClick={onClick}
    >
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
      {overlay}
    </div>
  );
});

export default MindCardBody;