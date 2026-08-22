'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

// 第八轮施工改版："引用角标"改名"注释"，点击工具栏按钮直接在光标位置插入一个
// 自动编号的[n]，不弹任何窗口——具体内容（标题/链接）改到编辑器下方的"注释
// 列表"里填，两处不再是同一个组件承担两种职责。
//
// 编号靠一个ProseMirror插件（appendTransaction）在每次文档变化后重新数一遍
// 全部citation节点、把结果写回每个节点自己的number属性——这是节点属性的真实
// 变化，能正确触发对应节点重新渲染，不是"指望sibling变化自动带动重渲染"这种
// 不可靠的做法。
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    citation: {
      insertCitation: () => ReturnType;
    };
  }
}

export interface CitationAttrs {
  citationId: string;
  number: number;
}

function CitationView({ node }: NodeViewProps) {
  const attrs = node.attrs as CitationAttrs;
  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <sup
        contentEditable={false}
        style={{
          color: 'hsl(var(--color-accent))',
          fontSize: '0.85em',
          padding: '0 1px',
        }}
      >
        [{attrs.number}]
      </sup>
    </NodeViewWrapper>
  );
}

const citationNumberingPluginKey = new PluginKey('citationNumbering');

export const CitationNode = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      citationId: { default: null },
      number: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="citation"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'citation' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationView);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: citationNumberingPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          let tr = newState.tr;
          let changed = false;
          let n = 0;
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'citation') {
              n += 1;
              if (node.attrs.number !== n) {
                tr = tr.setNodeAttribute(pos, 'number', n);
                changed = true;
              }
            }
          });
          return changed ? tr : null;
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertCitation:
        () =>
        ({ commands }) => {
          const citationId =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `citation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          return commands.insertContent({
            type: this.name,
            attrs: { citationId, number: 0 },
          });
        },
    };
  },
});
