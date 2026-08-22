'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, BackgroundColor } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Heading,
  RectangleEllipsis,
  Heading1,
  Heading2,
  Heading3,
  Type as TypeIcon,
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Baseline,
  Highlighter,
  Link2,
  ImageIcon,
} from 'lucide-react';
import { CitationNode } from './CitationNode';
import { XrefMark } from './XrefMark';
import { MediaNode, type MediaAttrs } from './MediaNode';
import { MediaDialog } from './MediaDialog';
import { XrefSearchDialog } from './XrefSearchDialog';
import { extractCitationIdsInOrder } from '@/lib/codex/tiptapUtils';

export interface CitationContent {
  title: string;
  url: string | null;
}

export interface CodexEditorHandle {
  getJSON: () => JSONContent;
  /** 按正文里[n]的出现顺序返回注释内容，直接就是保存接口要的citations数组形状。 */
  getCitations: () => CitationContent[];
}

interface CodexEditorProps {
  locale: string;
  initialContent: JSONContent;
  initialCitations: CitationContent[];
}

// 跟片语模块（RichTextComposer.tsx）文字颜色/背景色用的同一套8个iOS系统色，
// 保持全项目色板一致——这里没有直接import mind-cards那份组件，那边是给手机端
// 卡片编辑器做的气泡弹窗（BottomSheetPopover），跟这里桌面后台的下拉菜单
// 交互形态不是一回事，复用的是"TextStyle+Color+BackgroundColor这套Tiptap
// 扩展+对应的setColor/setBackgroundColor命令"这个实现方式本身，不是照搬UI组件。
const TEXT_COLORS = ['#000000', '#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#FFFFFF'] as const;
const BG_COLORS = ['', '#000000', '#FF3B30', '#FF9500', '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#FFFFFF'] as const;

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: 30,
        padding: '0 8px',
        borderRadius: 6,
        border: 'none',
        background: active ? 'hsl(var(--accent))' : 'transparent',
        color: active ? 'hsl(var(--color-accent))' : 'hsl(var(--foreground))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}

// 内容库正文编辑器：白色卡片正文区（跟着后台主题走，深色模式下是card配色，
// 不是"外层大黑框、文字浅灰看不清"那种两套配色打架的状态），标准格式走
// @tiptap/starter-kit（关掉了列表/引用块/站外链接这几个不需要的子扩展），
// 引用注释/站内链接/媒体块是三个自定义扩展，见各自文件顶部注释。
const CodexEditor = forwardRef<CodexEditorHandle, CodexEditorProps>(function CodexEditor(
  { locale, initialContent, initialCitations },
  ref
) {
  const [citationContents, setCitationContents] = useState<Record<string, CitationContent>>({});
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [xrefSelection, setXrefSelection] = useState<{ from: number; to: number; text: string } | null>(null);
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [bgColorMenuOpen, setBgColorMenuOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      // 无序/有序列表、引用块、站外链接这几个功能已确认不需要，直接在StarterKit
      // 层面关掉（不只是不放按钮）——这样连它们各自的markdown快捷输入（"- "、
      // "1. "、"> "）也一起失效，不会出现"按钮没了，但打这几个符号还是会触发"
      // 这种不一致。下划线不需要单独装扩展，StarterKit 3.x默认已经内置。
      StarterKit.configure({
        link: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      Color,
      BackgroundColor,
      CitationNode,
      XrefMark,
      MediaNode,
    ],
    content: initialContent && Object.keys(initialContent).length > 0 ? initialContent : '<p></p>',
    immediatelyRender: false,
    // 彻底关闭markdown快捷输入（打"# "变标题、"**x**"变加粗这类）——不是"有
    // 但没暴露入口"，是编辑器层面整个不识别这些符号序列，只能靠工具栏按钮。
    // 这两个是Tiptap核心提供的编辑器级总开关，一次性对所有扩展生效，不需要
    // 逐个去改Bold/Italic/Heading/Strike/Code各自的addInputRules。
    enableInputRules: false,
    enablePasteRules: false,
    // Tiptap 3.x默认不会因为选区变化（比如鼠标拖选一段文字）主动触发这个组件
    // 重新渲染，工具栏里读取editor.state.selection/isActive()的按钮会停留在
    // 上一次偶然重渲染时的旧状态——显式打开这个开关，让每次transaction（含纯
    // 选区变化）都触发重渲染，加粗/斜体/标题高亮和站内链接按钮的可用状态才能
    // 跟手。
    shouldRerenderOnTransaction: true,
    // 正文区域外层那圈白/浅色描边不是设计效果，是contenteditable元素被聚焦时
    // 浏览器自带的默认focus outline——Tiptap不会自动帮你关掉，需要显式声明。
    editorProps: {
      attributes: { style: 'outline: none;' },
    },
  });

  // 装载已有正文时，把citationId跟已存的注释内容（来自codex_citations表，
  // 按文档里citation节点当时的出现顺序位置配对）重新配成一份map，后续编辑
  // 会话里改citationId->内容的对应关系不再依赖顺序，靠id本身。
  useEffect(() => {
    if (!editor) return;
    const ids = extractCitationIdsInOrder(editor.getJSON() as never);
    const map: Record<string, CitationContent> = {};
    ids.forEach((id, i) => {
      map[id] = initialCitations[i] ?? { title: '', url: null };
    });
    setCitationContents(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useImperativeHandle(ref, () => ({
    getJSON: () => editor?.getJSON() ?? { type: 'doc', content: [] },
    getCitations: () => {
      if (!editor) return [];
      const ids = extractCitationIdsInOrder(editor.getJSON() as never);
      return ids.map((id) => citationContents[id] ?? { title: '', url: null });
    },
  }));

  if (!editor) return null;

  const citationIdsInOrder = extractCitationIdsInOrder(editor.getJSON() as never);
  const currentColor: string = editor.getAttributes('textStyle').color ?? '';
  const currentBgColor: string = editor.getAttributes('textStyle').backgroundColor ?? '';

  function updateCitation(id: string, fields: Partial<CitationContent>) {
    setCitationContents((prev) => ({
      ...prev,
      [id]: { title: prev[id]?.title ?? '', url: prev[id]?.url ?? null, ...fields },
    }));
  }

  function openXrefSearch() {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, ' ');
    setXrefSelection({ from, to, text });
  }

  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        color: 'hsl(var(--card-foreground))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: 6,
          borderBottom: '1px solid hsl(var(--border))',
          flexWrap: 'wrap',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative' }}>
          <ToolbarButton
            title="标题分级"
            active={editor.isActive('heading')}
            onClick={() => setHeadingMenuOpen((v) => !v)}
          >
            <Heading size={15} />
          </ToolbarButton>
          {headingMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 20,
                marginTop: 4,
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                padding: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {[
                { label: '正文', Icon: TypeIcon, action: () => editor.chain().focus().setParagraph().run() },
                { label: '标题 H1', Icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
                { label: '标题 H2', Icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
                { label: '标题 H3', Icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    item.action();
                    setHeadingMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: 'hsl(var(--foreground))',
                    fontSize: 13,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--accent))')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <item.Icon size={14} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarButton
          title="加粗"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="斜体"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="下划线"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>

        <div style={{ position: 'relative' }}>
          <ToolbarButton title="文字颜色" active={colorMenuOpen} onClick={() => setColorMenuOpen((v) => !v)}>
            <Baseline size={15} style={currentColor ? { color: currentColor } : undefined} />
          </ToolbarButton>
          {colorMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 20,
                marginTop: 4,
                display: 'flex',
                gap: 6,
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    setColorMenuOpen(false);
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    padding: 0,
                    background: c,
                    border: currentColor === c ? '2px solid hsl(var(--color-accent))' : '1px solid hsl(var(--border))',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <ToolbarButton title="文字背景色" active={bgColorMenuOpen} onClick={() => setBgColorMenuOpen((v) => !v)}>
            <Highlighter size={15} />
          </ToolbarButton>
          {bgColorMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 20,
                marginTop: 4,
                display: 'flex',
                gap: 6,
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {BG_COLORS.map((c) => (
                <button
                  key={c || 'none'}
                  type="button"
                  title={c || '清除背景色'}
                  onClick={() => {
                    if (c) editor.chain().focus().setBackgroundColor(c).run();
                    else editor.chain().focus().unsetBackgroundColor().run();
                    setBgColorMenuOpen(false);
                  }}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    padding: 0,
                    background: c || 'transparent',
                    border: currentBgColor === c ? '2px solid hsl(var(--color-accent))' : '1px solid hsl(var(--border))',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <ToolbarButton title="插入注释" onClick={() => editor.chain().focus().insertCitation().run()}>
          <RectangleEllipsis size={15} />
        </ToolbarButton>
        <ToolbarButton
          title={editor.state.selection.empty ? '先选中一段文字' : '插入站内链接'}
          disabled={editor.state.selection.empty}
          onClick={openXrefSearch}
        >
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton title="插入图片/视频" onClick={() => setMediaDialogOpen(true)}>
          <ImageIcon size={15} />
        </ToolbarButton>
      </div>

      {/* Tailwind的preflight会把h1/h2/h3这些标签的字号/字重重置成"跟父级一样"，
          浏览器原生的标题默认样式因此不生效——不加下面这段，切换标题级别时
          schema/isActive()状态其实已经正确变了，肉眼却看不出任何区别。用
          class（不是内联style）是因为内联style没法写"这个容器底下所有h1"这种
          后代选择器。 */}
      <style>{`
        .codex-editor-body h1 { font-size: 1.8em; font-weight: 700; margin: 0.7em 0 0.35em; line-height: 1.3; }
        .codex-editor-body h2 { font-size: 1.4em; font-weight: 700; margin: 0.6em 0 0.3em; line-height: 1.35; }
        .codex-editor-body h3 { font-size: 1.15em; font-weight: 600; margin: 0.5em 0 0.25em; line-height: 1.4; }
        .codex-editor-body p:first-child, .codex-editor-body h1:first-child, .codex-editor-body h2:first-child, .codex-editor-body h3:first-child { margin-top: 0; }
      `}</style>
      <div
        className="codex-editor-body"
        style={{ padding: '16px 20px', minHeight: 'calc(100vh - 300px)', fontSize: 14, lineHeight: 1.7 }}
      >
        <EditorContent editor={editor} />
      </div>

      {citationIdsInOrder.length > 0 && (
        <div style={{ borderTop: '1px solid hsl(var(--border))', padding: '14px 20px' }}>
          <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>注释列表</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {citationIdsInOrder.map((id, index) => {
              const content = citationContents[id] ?? { title: '', url: null };
              return (
                <div key={id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', width: 24, flexShrink: 0 }}>
                    [{index + 1}]
                  </span>
                  <input
                    value={content.title}
                    onChange={(e) => updateCitation(id, { title: e.target.value })}
                    placeholder="来源标题"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      fontSize: 12,
                    }}
                  />
                  <input
                    value={content.url ?? ''}
                    onChange={(e) => updateCitation(id, { url: e.target.value || null })}
                    placeholder="来源链接（可留空）"
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--background))',
                      color: 'hsl(var(--foreground))',
                      fontSize: 12,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mediaDialogOpen && (
        <MediaDialog
          initial={{ url: null, size: 'medium', align: 'center' }}
          onCancel={() => setMediaDialogOpen(false)}
          onConfirm={(attrs: MediaAttrs) => {
            editor.chain().focus().insertMedia(attrs).run();
            setMediaDialogOpen(false);
          }}
        />
      )}

      {xrefSelection && (
        <XrefSearchDialog
          locale={locale}
          initialQuery={xrefSelection.text}
          onCancel={() => setXrefSelection(null)}
          onPick={(target) => {
            editor
              .chain()
              .focus()
              .setTextSelection(xrefSelection)
              .setMark('xref', { targetEntryId: target.id })
              .run();
            setXrefSelection(null);
          }}
        />
      )}
    </div>
  );
});

export default CodexEditor;
