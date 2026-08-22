'use client';

import { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { MediaDialog } from './MediaDialog';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    media: {
      insertMedia: (attrs: MediaAttrs) => ReturnType;
    };
  }
}

export type MediaSize = 'small' | 'medium' | 'large' | 'full';
export type MediaAlign = 'left' | 'center' | 'right' | 'full';

export interface MediaAttrs {
  url: string | null;
  size: MediaSize;
  align: MediaAlign;
}

const SIZE_WIDTH: Record<MediaSize, string> = {
  small: '33%',
  medium: '60%',
  large: '85%',
  full: '100%',
};

const ALIGN_STYLE: Record<MediaAlign, React.CSSProperties> = {
  left: { marginLeft: 0, marginRight: 'auto' },
  center: { marginLeft: 'auto', marginRight: 'auto' },
  right: { marginLeft: 'auto', marginRight: 0 },
  full: { marginLeft: 0, marginRight: 0 },
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

// 插入时（见 CodexEditor.tsx 的工具栏按钮）已经先弹过 MediaDialog、带着完整
// url/size/align 数据才创建这个节点，所以这里不需要处理"刚插入、还没有url"
// 的过渡态——第八轮施工排查"插入后不显示"的bug，根源就在旧版本里节点先以
// 空url状态存在、再在NodeView内部编辑填充，这次从源头上避开了这种中间态。
// 点击已插入的媒体，重新弹同一个MediaDialog（预填当前值）修改。
function MediaView({ node, updateAttributes, selected }: NodeViewProps) {
  const attrs = node.attrs as MediaAttrs;
  const [editing, setEditing] = useState(false);
  const width = attrs.align === 'full' ? '100%' : SIZE_WIDTH[attrs.size];

  return (
    <NodeViewWrapper
      as="div"
      style={{
        margin: '1.5em 0',
        borderRadius: 8,
        outline: selected ? '2px solid hsl(var(--color-accent))' : 'none',
      }}
    >
      <div
        contentEditable={false}
        onClick={() => setEditing(true)}
        style={{ width, cursor: 'pointer', ...ALIGN_STYLE[attrs.align] }}
      >
        {attrs.url ? (
          isVideoUrl(attrs.url) ? (
            <video src={attrs.url} controls style={{ width: '100%', display: 'block', borderRadius: 8 }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attrs.url} alt="" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
          )
        ) : (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              borderRadius: 8,
              border: '1px dashed hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))',
              fontSize: 13,
            }}
          >
            点击设置图片/视频
          </div>
        )}
      </div>

      {editing && (
        <MediaDialog
          initial={attrs}
          onCancel={() => setEditing(false)}
          onConfirm={(newAttrs) => {
            updateAttributes(newAttrs);
            setEditing(false);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

export const MediaNode = Node.create({
  name: 'media',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: { default: null },
      size: { default: 'medium' },
      align: { default: 'center' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="media"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'media' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaView);
  },

  addCommands() {
    return {
      insertMedia:
        (attrs: MediaAttrs) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs });
        },
    };
  },
});
