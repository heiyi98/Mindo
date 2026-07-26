'use client';
import { forwardRef, useImperativeHandle, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import { TextStyle, BackgroundColor } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import History from '@tiptap/extension-history';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  TextAlignStart,
  Italic as ItalicIcon, Underline as UnderlineIcon,
} from 'lucide-react';
import type { CardVisibility } from '@/lib/mindCards/visibility';
import type {
  MindCardCardStyle, MindCardRun,
  HorizontalAlign, VerticalAlign, MindCardFontSizeTier,
} from '@/lib/mindCards/style';
import { DEFAULT_MIND_CARD_CARD_STYLE } from '@/lib/mindCards/style';
import { getCardWrapperStyle, getCardPaddedFlexStyle, getCardTextStyle, MIND_CARD_FONT_SIZE_PX } from '@/lib/mindCards/cardStyleCss';
import { resolveFontPickerHighlights } from '@/lib/mindCards/fontCatalog';
import FontPicker, { type FontPickerSelection } from './FontPicker';
import ColorPicker from './ColorPicker';
import BackgroundColorPicker from './BackgroundColorPicker';
import TextHighlightPicker from './TextHighlightPicker';
import PrivacyPopover from './PrivacyPopover';

const CARD_BASE_DIMENSION_PX = 400; // 3:4基准宽度（横板固定宽的参考值）
const CARD_BASE_CROSS_PX = (CARD_BASE_DIMENSION_PX * 4) / 3; // ≈533.33px，横竖排互换时另一维度的固定/floor参考值

// 编辑画布尺寸：一个方向固定，另一个方向随内容自由生长。
//
// 竖版：width绝不能写'auto'——'auto'对一个普通block元素的真实含义是"撑满父容器能给的
// 宽度"，不是"包住内容实际大小"，这是两码事。要真正做到"按内容收缩/生长"，必须显式声明
// fit-content，配合minWidth兜底、maxWidth防止内容极多时撑爆视口。
//
// 横板：不能靠aspect-ratio实现"内容超出就把框撑大"——aspect-ratio只是划定一个固定比例的
// 框，内容超出时是溢出到框外面（视觉上文字探出卡片背景），框本身不会变大。要让框跟着内容
// 真正生长，只能回到最朴素的做法：height留auto（一个普通block元素的高度默认就是完全由内容
// 撑开的），minHeight只用来给"内容很少时"兜一个不至于太矮的下限。
function getComposerCanvasStyle(card: MindCardCardStyle): CSSProperties {
  if (card.vertical) {
    return {
      height: CARD_BASE_CROSS_PX,
      width: 'fit-content',
      minWidth: CARD_BASE_DIMENSION_PX,
      maxWidth: '90vw',
    };
  }
  return {
    width: '100%',
    maxWidth: CARD_BASE_DIMENSION_PX,
    height: 'auto',
    minHeight: CARD_BASE_CROSS_PX,
  };
}

const H_ALIGNS: HorizontalAlign[] = ['left', 'center', 'right'];
const V_ALIGNS: VerticalAlign[] = ['top', 'center', 'bottom'];
const FONT_SIZE_TIERS: MindCardFontSizeTier[] = [1, 2, 3, 4, 5];

const H_ALIGN_ICON: Record<HorizontalAlign, typeof AlignStartVertical> = {
  left: AlignStartVertical,
  center: AlignCenterVertical,
  right: AlignEndVertical,
};
const V_ALIGN_ICON: Record<VerticalAlign, typeof AlignStartHorizontal> = {
  top: AlignStartHorizontal,
  center: AlignCenterHorizontal,
  bottom: AlignEndHorizontal,
};

function docToRuns(doc: PMNode): MindCardRun[] {
  const runs: MindCardRun[] = [];
  let isFirstParagraph = true;
  doc.forEach((paragraph) => {
    // 段落之间用跟硬换行完全相同的换行标记衔接——不区分"这是按Enter新起的段落"
    // 还是"按Shift+Enter的硬换行"，两者存进数据、渲染出来的效果完全一致，
    // 不需要额外记录是哪种按键产生的。
    if (!isFirstParagraph) {
      runs.push({ text: '\n' });
    }
    isFirstParagraph = false;

    paragraph.forEach((node) => {
      if (node.isText) {
        const run: MindCardRun = { text: node.text ?? '' };
        node.marks.forEach((mark) => {
          if (mark.type.name === 'bold') run.bold = true;
          if (mark.type.name === 'italic') run.italic = true;
          if (mark.type.name === 'underline') run.underline = true;
          if (mark.type.name === 'textStyle' && mark.attrs.color) run.color = mark.attrs.color as string;
          if (mark.type.name === 'textStyle' && mark.attrs.backgroundColor) {
            run.backgroundColor = mark.attrs.backgroundColor as string;
          }
        });
        runs.push(run);
      } else if (node.type.name === 'hardBreak') {
        runs.push({ text: '\n' });
      }
    });
  });
  return runs;
}

export interface RichTextComposerSubmitPayload {
  runs: MindCardRun[];
  style: MindCardCardStyle;
  visibility: CardVisibility;
  attachWuxing: boolean;
  attachBigfive: boolean;
  attachDayMaster: boolean;
}

export interface RichTextComposerHandle {
  publish: () => RichTextComposerSubmitPayload | null;
}

function ToolbarButton({
  active, onClick, children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-center w-full h-8">
      <span
        className="flex items-center justify-center rounded-full"
        style={{
          width: 28,
          height: 28,
          color: 'hsl(var(--foreground))',
          background: active ? 'hsl(var(--foreground) / 0.12)' : 'transparent',
        }}
      >
        {children}
      </span>
    </button>
  );
}

function GridCell({ children, dividerBefore }: { children: ReactNode; dividerBefore?: boolean }) {
  return (
    <div
      className="flex items-center justify-center"
      style={dividerBefore ? { borderLeft: '1px solid hsl(var(--border))', marginLeft: -2, paddingLeft: 6 } : undefined}
    >
      {children}
    </div>
  );
}

function AttachCircle({
  active, onClick, glyph,
}: {
  active: boolean;
  onClick: () => void;
  glyph: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center rounded-full"
      style={{
        width: 36,
        height: 36,
        background: active ? 'hsl(var(--foreground) / 0.12)' : 'transparent',
        border: '1px solid hsl(var(--border))',
        color: 'hsl(var(--foreground))',
        fontSize: 13,
      }}
    >
      {glyph}
    </button>
  );
}

// 字号圆点：视觉尺寸(6px)保持不变，点击热区放大成24×24的透明区域包住小圆点。
const DOT_POSITIONS_PCT = [16.6667, 33.3333, 50, 66.6667, 83.3333];
const DOT_HIT_AREA_PX = 24;
const DOT_VISUAL_PX = 6;

function FontSizeDots({ value, onChange }: { value: MindCardFontSizeTier; onChange: (tier: MindCardFontSizeTier) => void }) {
  return (
    <div className="relative" style={{ gridColumn: '1 / 4', height: 8 }}>
      {FONT_SIZE_TIERS.map((tier, i) => (
        <button
          key={tier}
          type="button"
          onClick={() => onChange(tier)}
          className="absolute flex items-center justify-center"
          style={{
            left: `${DOT_POSITIONS_PCT[i]}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: DOT_HIT_AREA_PX,
            height: DOT_HIT_AREA_PX,
          }}
        >
          <span
            className="rounded-full"
            style={{
              width: DOT_VISUAL_PX,
              height: DOT_VISUAL_PX,
              background: value === tier ? 'hsl(var(--foreground))' : 'hsl(var(--foreground) / 0.3)',
            }}
          />
        </button>
      ))}
    </div>
  );
}

// 假光标：编辑器为空、用户还没开始打字时显示的纯视觉闪烁竖线（横排）/横线（竖排，因为
// 光标本身应该跟阅读方向垂直）。用户敲下第一个字，editor.isEmpty立刻变false，这个组件
// 自动不再渲染，交棒给真实的编辑状态——不是真正在编辑，只是提前告诉用户"这里能打字，
// 字会出现在这个位置"。
// 定位复用getCardPaddedFlexStyle——跟真实文字（.ProseMirror）用的是完全同一套留白+对齐
// 规则，所以假光标出现的位置，跟真正开始打字后光标实际所在的位置是一致的，不需要另外
// 计算坐标。
function FakeCaret({ card }: { card: MindCardCardStyle }) {
  const size = MIND_CARD_FONT_SIZE_PX[card.fontSize];
  const barStyle: CSSProperties = card.vertical
    ? { width: size, height: 2 }
    : { width: 2, height: size };
  return (
    <div className="pointer-events-none absolute inset-0" style={getCardPaddedFlexStyle(card)}>
      <div
        style={{
          ...barStyle,
          background: 'hsl(var(--foreground))',
          animation: 'mindcard-caret-blink 1s step-end infinite',
        }}
      />
    </div>
  );
}

const GRID_ROW_CLASS = 'grid gap-1';
const GRID_ROW_STYLE = { gridTemplateColumns: 'repeat(9, 1fr)' } as const;

const RichTextComposer = forwardRef<RichTextComposerHandle>(function RichTextComposer(_props, ref) {
  const [, forceRerender] = useState(0);
  const [card, setCard] = useState<MindCardCardStyle>(DEFAULT_MIND_CARD_CARD_STYLE);
  const [visibility, setVisibility] = useState<CardVisibility>('public');
  const [attachWuxing, setAttachWuxing] = useState(false);
  const [attachBigfive, setAttachBigfive] = useState(false);
  const [attachDayMaster, setAttachDayMaster] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Document, Paragraph, Text, HardBreak,
      Bold, Italic, Underline,
      TextStyle, Color, BackgroundColor,
      History,
    ],
    content: '',
    onTransaction: () => forceRerender((n) => n + 1),
    // 绑定编辑器自己的onCreate生命周期事件，而不是外部用useEffect去猜"什么时候该聚焦"。
    // 开发环境下React有时会把初始化过程重复执行一遍（用于提前暴露潜在问题），如果聚焦逻辑
    // 挂在useEffect上，可能会作用到一个随后被替换掉的旧编辑器实例上，等于没生效。onCreate
    // 是编辑器自己精确报告"我真的创建完成了"的时间点，不会有这类时机误判的问题。
    // Tiptap官方仓库里有一条已确认的记录在案的bug："autofocus选项自某个版本起失效"。
    // 即便我们绕开了那个自带选项、改成手动调用聚焦命令，大概率撞上的是同一个底层时机
    // 问题。这次改用setTimeout（明确等待一小段时间，而不是更精细但更容易受渲染细节
    // 影响的requestAnimationFrame）——这是社区里针对这类问题验证过更可靠的写法。
    // 同时加isDestroyed保护，避免这段延迟执行的代码在编辑器已经被销毁后才触发
    // （常见于开发环境下React会把某些初始化过程重复执行一遍的场景）。
    onCreate: ({ editor: createdEditor }) => {
      setTimeout(() => {
        if (createdEditor.isDestroyed) return;
        createdEditor.commands.focus('end', { scrollIntoView: false });
      }, 50);
    },
  });

  // .ProseMirror本体（contenteditable元素）只设置字体/书写方向/横排时的宽度和对齐这些
  // 安全的文字样式，不设置任何padding/flex/display——那些留给下面非editable的中间层。
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom as HTMLElement;
    const text = getCardTextStyle(card);

    dom.style.width = text.width ? String(text.width) : '';
    dom.style.fontFamily = String(text.fontFamily ?? '');
    dom.style.fontSize = typeof text.fontSize === 'number' ? `${text.fontSize}px` : String(text.fontSize ?? '');
    dom.style.color = String(text.color ?? '');
    dom.style.writingMode = String(text.writingMode ?? '');
    dom.style.textOrientation = String(text.textOrientation ?? '');
    dom.style.whiteSpace = String(text.whiteSpace ?? '');
    dom.style.wordBreak = String(text.wordBreak ?? '');
    dom.style.textAlign = text.textAlign ? String(text.textAlign) : '';
  }, [editor, card]);

  // 不依赖"进页面就自动聚焦"这件事一定成功——那是前面反复调整过、Tiptap官方自己都还
  // 没修好的问题。改成监听用户的第一次真实按键：只要检测到用户开始敲键盘、且当前焦点
  // 不在别的输入框上，就立刻把这次按键接到编辑器。绑定在真实的用户操作（按键本身）上，
  // 浏览器对这类场景的支持稳定得多，不会重蹈"程序自己喊聚焦、但没人理"的覆辙——这跟很多
  // "打开就能直接搜索"的搜索框是同一个原理。
  useEffect(() => {
    if (!editor) return;
    const handleFirstKeydown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const alreadyFocusedHere = active === editor.view.dom;
      const typingElsewhere = active instanceof HTMLElement && (
        active.tagName === 'INPUT'
        || active.tagName === 'TEXTAREA'
        || active.getAttribute('contenteditable') === 'true'
      );
      if (alreadyFocusedHere || typingElsewhere) return;
      // 忽略快捷键组合和纯功能键，只对会产生实际字符输入/删除/换行的按键接管
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Enter') return;
      editor.commands.focus('end');
    };
    window.addEventListener('keydown', handleFirstKeydown);
    return () => window.removeEventListener('keydown', handleFirstKeydown);
  }, [editor]);

  useImperativeHandle(ref, () => ({
    publish: () => {
      if (!editor) return null;
      const runs = docToRuns(editor.state.doc);
      if (runs.every((r) => !r.text.trim())) return null;
      return { runs, style: card, visibility, attachWuxing, attachBigfive, attachDayMaster };
    },
  }), [editor, card, visibility, attachWuxing, attachBigfive, attachDayMaster]);

  const patchCard = (patch: Partial<MindCardCardStyle>) => setCard((prev) => ({ ...prev, ...patch }));
  const currentColor: string = editor?.getAttributes('textStyle').color ?? '';
  const currentHighlight: string = editor?.getAttributes('textStyle').backgroundColor ?? '';

  const fontPickerValue = resolveFontPickerHighlights(card.fontFamily);

  const handleFontChange = (selection: FontPickerSelection) => {
    const next = { ...card.fontFamily };
    if (selection.groupKey === 'latin') next.latin = selection.technicalName;
    else if (selection.groupKey === 'kr') next.kr = selection.technicalName;
    else next.cjkChain = selection.relatedChain ?? [selection.technicalName];
    patchCard({ fontFamily: next });
  };

  // 不区分"点在.ProseMirror内部还是外部"——一律由这段代码统一计算光标该落在哪。
  // 夹紧坐标时用的是"用户实际点击的这整个框"(currentTarget，也就是留白+对齐层)的范围，
  // 不是.ProseMirror自己的范围——.ProseMirror的实际大小只取决于已经打了多少字，可能比
  // 外层这个可见框小得多（比如内容很少，但外层框有"最低高度兜底"撑出一截空间），如果只按
  // .ProseMirror自己的范围夹紧，那截多出来的空间点了会没反应，重新变成死区。
  const handleComposerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clampedX = Math.min(Math.max(e.clientX, rect.left), rect.right - 1);
    const clampedY = Math.min(Math.max(e.clientY, rect.top), rect.bottom - 1);
    const pos = editor.view.posAtCoords({ left: clampedX, top: clampedY });
    if (pos) {
      editor.chain().focus(pos.pos).run();
    } else {
      editor.chain().focus('end').run();
    }
  };

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes mindcard-caret-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>

      <div
        className="rounded-2xl cursor-text mx-auto flex flex-col"
        style={{ ...getCardWrapperStyle(card), ...getComposerCanvasStyle(card) }}
      >
        {/* 这层是普通、非contenteditable的div，安全地承担留白+对齐职责，跟MindCardBody
            共用同一套getCardPaddedFlexStyle。这里额外加flex:1——getCardPaddedFlexStyle
            里的height:'100%'是百分比高度，只有在父级有"明确写死的高度"时才会真正生效，
            而外层卡片用的是"最低高度兜底"（不是写死的固定值），百分比高度在这种情况下
            不会生效，这层会缩回到只跟内容一样大，导致卡片下半部分变成点击死区。
            让外层卡片本身是flex容器、这层用flex:1，能确定性地撑满外层卡片的全部可用空间，
            不再依赖百分比高度这个在特定条件下会静默失效的机制。
            position:relative是假光标(FakeCaret)绝对定位的基准。 */}
        <div
          className="relative [&_.ProseMirror]:outline-none [&_.ProseMirror]:border-none [&_.ProseMirror_p]:m-0"
          style={{ ...getCardPaddedFlexStyle(card), flex: 1 }}
          onClick={handleComposerClick}
        >
          <EditorContent editor={editor} />
          {editor?.isEmpty && <FakeCaret card={card} />}
        </div>
      </div>

      <div className={GRID_ROW_CLASS} style={{ ...GRID_ROW_STYLE, gridTemplateRows: 'auto auto', rowGap: 4 }}>
        <GridCell>
          <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>A</span>
        </GridCell>
        <GridCell>
          <span style={{ fontSize: 15, color: 'hsl(var(--muted-foreground))' }}>A</span>
        </GridCell>
        <GridCell>
          <span style={{ fontSize: 20, color: 'hsl(var(--muted-foreground))' }}>A</span>
        </GridCell>
        <GridCell dividerBefore>
          <ToolbarButton active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <span style={{ fontWeight: 900, fontSize: 15 }}>B</span>
          </ToolbarButton>
        </GridCell>
        <GridCell>
          <ToolbarButton active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <ItalicIcon size={14} />
          </ToolbarButton>
        </GridCell>
        <GridCell>
          <ToolbarButton active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={14} />
          </ToolbarButton>
        </GridCell>
        <GridCell dividerBefore>
          <FontPicker value={fontPickerValue} onChange={handleFontChange} />
        </GridCell>
        <GridCell>
          <ColorPicker
            value={currentColor}
            onChange={(color) => editor?.chain().focus().setColor(color).run()}
          />
        </GridCell>
        <GridCell>
          <TextHighlightPicker
            value={currentHighlight}
            onChange={(color) => editor?.chain().focus().setBackgroundColor(color).run()}
          />
        </GridCell>
        <FontSizeDots value={card.fontSize} onChange={(fontSize) => patchCard({ fontSize })} />
      </div>

      <div className={GRID_ROW_CLASS} style={GRID_ROW_STYLE}>
        {H_ALIGNS.map((a) => {
          const Icon = H_ALIGN_ICON[a];
          return (
            <GridCell key={a}>
              <ToolbarButton active={card.align === a} onClick={() => patchCard({ align: a })}>
                <Icon size={14} />
              </ToolbarButton>
            </GridCell>
          );
        })}
        {V_ALIGNS.map((v, i) => {
          const Icon = V_ALIGN_ICON[v];
          return (
            <GridCell key={v} dividerBefore={i === 0}>
              <ToolbarButton active={card.valign === v} onClick={() => patchCard({ valign: v })}>
                <Icon size={14} />
              </ToolbarButton>
            </GridCell>
          );
        })}
        <GridCell dividerBefore>
          <ToolbarButton active={!card.vertical} onClick={() => patchCard({ vertical: false })}>
            <TextAlignStart size={14} />
          </ToolbarButton>
        </GridCell>
        <GridCell>
          <ToolbarButton active={card.vertical} onClick={() => patchCard({ vertical: true })}>
            <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
              <TextAlignStart size={14} />
            </span>
          </ToolbarButton>
        </GridCell>
        <GridCell>
          <BackgroundColorPicker value={card.backgroundColor} onChange={(backgroundColor) => patchCard({ backgroundColor })} />
        </GridCell>
      </div>

      <div className={GRID_ROW_CLASS} style={GRID_ROW_STYLE}>
        <GridCell>
          <PrivacyPopover value={visibility} onChange={setVisibility} />
        </GridCell>
        <div style={{ gridColumn: 'span 5' }} />
        <div className="flex items-center justify-end gap-3" style={{ gridColumn: 'span 3' }}>
          <AttachCircle active={attachDayMaster} onClick={() => setAttachDayMaster((v) => !v)} glyph="命" />
          <AttachCircle active={attachWuxing} onClick={() => setAttachWuxing((v) => !v)} glyph="八" />
          <AttachCircle active={attachBigfive} onClick={() => setAttachBigfive((v) => !v)} glyph="五" />
        </div>
      </div>
    </div>
  );
});

export default RichTextComposer;