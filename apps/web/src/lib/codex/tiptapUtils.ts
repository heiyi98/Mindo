// 处理"body里存的Tiptap原生JSON文档"的一批纯函数工具，前后台共用。

interface TiptapNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
}

function walk(node: TiptapNode, visit: (n: TiptapNode) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

/**
 * 按文档出现顺序收集全部citation节点的citationId——注释的实际内容（标题/链接）
 * 不再存在节点自己身上，存在编辑器的独立状态里（按citationId分组），这个函数
 * 只负责"顺序"，保存时用来把独立状态按正确顺序整理成要写入codex_citations表
 * 的数组，见 components/admin/codex/editor/CodexEditor.tsx。
 */
export function extractCitationIdsInOrder(doc: TiptapNode): string[] {
  const ids: string[] = [];
  walk(doc, (node) => {
    if (node.type === 'citation' && typeof node.attrs?.citationId === 'string') {
      ids.push(node.attrs.citationId as string);
    }
  });
  return ids;
}

/** 抽取纯文本（不含citation/xref/media节点自身的属性文字），用于摘要/全文导出。 */
export function extractPlainText(doc: TiptapNode, maxLength?: number): string {
  const parts: string[] = [];
  walk(doc, (node) => {
    if (typeof node.text === 'string') parts.push(node.text);
    if (node.type === 'xref' && typeof node.attrs?.label === 'string') {
      parts.push(node.attrs.label as string);
    }
  });
  const text = parts.join('').replace(/\s+/g, ' ').trim();
  return maxLength ? text.slice(0, maxLength) : text;
}
