import { Mark, mergeAttributes } from '@tiptap/core';

// 第八轮施工改版：站内链接从Node改回Mark——"先选中一段文字,再点击站内链接
// 按钮,弹出搜索框,选定后链接直接包裹住原先选中的那段文字"，这个交互本身
// 就要求"包裹住已经存在的一段正文文字"，只有Mark能做到（Node是插入一个新的
// 独立元素，做不到"给选中文字本身穿上链接"）。
//
// 这次不受Keystatic组件API限制——那时候mark类型的组件没有开放"应用之前先
// 做点什么"的接口，做不到"选中文字后立刻弹搜索框"。这次是自己的编辑器，
// "先弹搜索、选完再真正打标记"这个顺序完全由 CodexEditor.tsx 自己的工具栏
// 按钮逻辑控制（先读取当前选区，弹出搜索popover，选中目标后再对着当初
// 记下来的那个选区调用 setMark），不需要mark本身提供任何特殊接口。
// 这个文件因此只负责schema/渲染样式，交互逻辑不在这里。
export interface XrefAttrs {
  targetEntryId: string | null;
}

export const XrefMark = Mark.create({
  name: 'xref',

  addAttributes() {
    return {
      targetEntryId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="xref"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'xref',
        style: 'color:hsl(var(--color-accent));text-decoration:underline;cursor:pointer;',
      }),
      0,
    ];
  },
});
