import type { ReactNode } from 'react';
import Link from 'next/link';

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

export interface XrefTarget {
  title: string;
  url: string;
}

const SIZE_WIDTH: Record<string, string> = { small: '33%', medium: '60%', large: '85%', full: '100%' };
const ALIGN_STYLE: Record<string, React.CSSProperties> = {
  left: { marginLeft: 0, marginRight: 'auto' },
  center: { marginLeft: 'auto', marginRight: 'auto' },
  right: { marginLeft: 0, marginRight: 'auto', textAlign: 'right' },
  full: { marginLeft: 0, marginRight: 0 },
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

function renderText(node: TiptapNode, key: string): ReactNode {
  let content: ReactNode = node.text ?? '';
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        content = <strong key={key}>{content}</strong>;
        break;
      case 'italic':
        content = <em key={key}>{content}</em>;
        break;
      case 'strike':
        content = <s key={key}>{content}</s>;
        break;
      case 'code':
        content = (
          <code key={key} style={{ background: 'hsl(var(--muted))', padding: '1px 5px', borderRadius: 4 }}>
            {content}
          </code>
        );
        break;
      case 'link':
        content = (
          <a
            key={key}
            href={typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}
          >
            {content}
          </a>
        );
        break;
    }
  }
  return content;
}

function renderChildren(nodes: TiptapNode[] | undefined, ctx: RenderCtx, keyPrefix: string): ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, ctx, `${keyPrefix}-${i}`));
}

interface RenderCtx {
  xrefMap: Map<string, XrefTarget>;
}

function renderNode(node: TiptapNode, ctx: RenderCtx, key: string): ReactNode {
  switch (node.type) {
    case 'text':
      return renderText(node, key);

    case 'paragraph':
      return <p key={key} style={{ margin: '0 0 1em' }}>{renderChildren(node.content, ctx, key)}</p>;

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2;
      const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as unknown) as 'h1';
      return (
        <Tag key={key} style={{ margin: '1.2em 0 0.5em' }}>
          {renderChildren(node.content, ctx, key)}
        </Tag>
      );
    }

    case 'bulletList':
      return <ul key={key} style={{ margin: '0 0 1em', paddingLeft: 20 }}>{renderChildren(node.content, ctx, key)}</ul>;

    case 'orderedList':
      return <ol key={key} style={{ margin: '0 0 1em', paddingLeft: 20 }}>{renderChildren(node.content, ctx, key)}</ol>;

    case 'listItem':
      return <li key={key}>{renderChildren(node.content, ctx, key)}</li>;

    case 'blockquote':
      return (
        <blockquote
          key={key}
          style={{ margin: '0 0 1em', paddingLeft: 16, borderLeft: '3px solid hsl(var(--border))', opacity: 0.85 }}
        >
          {renderChildren(node.content, ctx, key)}
        </blockquote>
      );

    case 'codeBlock':
      return (
        <pre key={key} style={{ background: 'hsl(var(--muted))', padding: 12, borderRadius: 8, overflowX: 'auto', margin: '0 0 1em' }}>
          <code>{renderChildren(node.content, ctx, key)}</code>
        </pre>
      );

    case 'horizontalRule':
      return <hr key={key} style={{ margin: '2em 0', border: 'none', borderTop: '1px solid hsl(var(--border))' }} />;

    case 'hardBreak':
      return <br key={key} />;

    case 'citation': {
      // number是编辑器里ProseMirror插件按文档顺序算好、随文档一起存下来的，
      // 直接读，不需要在渲染时重新数一遍。
      const n = (node.attrs?.number as number) ?? 0;
      return (
        <sup key={key}>
          <a
            href={`#codex-ref-${n}`}
            style={{ color: 'hsl(var(--primary))', textDecoration: 'none', fontSize: '0.85em', marginLeft: 1 }}
          >
            [{n}]
          </a>
        </sup>
      );
    }

    case 'xref': {
      const targetId = node.attrs?.targetEntryId as string | null;
      const label = (node.attrs?.label as string) || '';
      const target = targetId ? ctx.xrefMap.get(targetId) : undefined;
      if (!target) {
        return (
          <span key={key} style={{ textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
            {label}
          </span>
        );
      }
      return (
        <Link key={key} href={target.url} title={target.title} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}>
          {label || target.title}
        </Link>
      );
    }

    case 'media': {
      const url = node.attrs?.url as string | null;
      const size = (node.attrs?.size as string) ?? 'medium';
      const align = (node.attrs?.align as string) ?? 'center';
      if (!url) return null;
      const width = align === 'full' ? '100%' : SIZE_WIDTH[size] ?? '60%';
      return (
        <div key={key} style={{ margin: '1.5em 0', width, ...ALIGN_STYLE[align] }}>
          {isVideoUrl(url) ? (
            <video src={url} controls style={{ width: '100%', display: 'block', borderRadius: 8 }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" style={{ width: '100%', display: 'block', borderRadius: 8 }} />
          )}
        </div>
      );
    }

    case 'doc':
      return <div key={key}>{renderChildren(node.content, ctx, key)}</div>;

    default:
      return node.content ? <div key={key}>{renderChildren(node.content, ctx, key)}</div> : null;
  }
}

export function TiptapDocument({
  doc,
  xrefMap,
}: {
  doc: TiptapNode;
  xrefMap: Map<string, XrefTarget>;
}) {
  const ctx: RenderCtx = { xrefMap };
  return <>{renderChildren(doc.content, ctx, 'root')}</>;
}

export interface CitationFooterItem {
  title: string;
  url: string | null;
}

// 注释内容不再从body(JSON)里抽——citation节点自己只带编号，内容存在
// codex_citations表里，这里直接吃repository查出来的那份数据（已经按
// order_index排好序，序号跟正文里的[n]是同一套编号，见CitationNode.tsx）。
export function CitationsFooter({ citations, title }: { citations: CitationFooterItem[]; title: string }) {
  if (citations.length === 0) return null;

  return (
    <section style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid hsl(var(--border))' }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{title}</h2>
      <ol style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0, listStyle: 'none' }}>
        {citations.map((c, index) => {
          const n = index + 1;
          return (
            <li
              key={n}
              id={`codex-ref-${n}`}
              style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.5, scrollMarginTop: 80 }}
            >
              <span style={{ opacity: 0.6, flexShrink: 0 }}>[{n}]</span>
              <span>
                {c.title && <strong style={{ display: 'block' }}>{c.title}</strong>}
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--primary))', wordBreak: 'break-all' }}>
                    {c.url}
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
