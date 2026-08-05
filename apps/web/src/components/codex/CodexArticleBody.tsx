import type { ReactNode } from 'react';
import { CitationProvider, CitationToggleButton } from './Citation';

interface TocItem {
  url: string;
  title: ReactNode;
  depth: number;
}

interface CodexArticleBodyProps {
  title: string;
  toc: TocItem[];
  showToc?: boolean;
  children: ReactNode;
}

// 所有 Codex 正文页（普通词条 + 主题叙事首页）共用的渲染壳：套引用角标机制渲染正文。
export function CodexArticleBody({ title, toc, showToc = true, children }: CodexArticleBodyProps) {
  return (
    <div>
      <h1>{title}</h1>

      <CitationProvider>
        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '16px 0 8px' }}>
          <CitationToggleButton />
        </div>

        {showToc && toc.length > 0 && (
          <nav style={{ margin: '16px 0', fontSize: 14, opacity: 0.75 }}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {toc.map((item) => (
                <li key={item.url} style={{ marginLeft: (item.depth - 1) * 12 }}>
                  <a href={item.url}>{item.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <article>{children}</article>
      </CitationProvider>
    </div>
  );
}
