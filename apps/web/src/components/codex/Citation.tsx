'use client';

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VisibilityValue {
  visible: boolean;
  toggle: () => void;
}

interface CounterValue {
  next: () => number;
}

const VisibilityContext = createContext<VisibilityValue | null>(null);
const CounterContext = createContext<CounterValue | null>(null);

export function CitationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  const counterRef = useRef(0);
  // 每次渲染开始时归零：已挂载的 Cite 用 useMemo 缓存了自己的序号，不会重新取号，
  // 只有新挂载的 Cite 会在这一轮渲染里按顺序取号。
  counterRef.current = 0;

  const visibilityValue = useMemo<VisibilityValue>(
    () => ({ visible, toggle: () => setVisible((v) => !v) }),
    [visible]
  );
  const counterValue = useMemo<CounterValue>(
    () => ({ next: () => ++counterRef.current }),
    []
  );

  return (
    <VisibilityContext.Provider value={visibilityValue}>
      <CounterContext.Provider value={counterValue}>{children}</CounterContext.Provider>
    </VisibilityContext.Provider>
  );
}

export function CitationToggleButton() {
  const vis = useContext(VisibilityContext);
  const t = useTranslations('codex.citations');
  if (!vis) return null;

  return (
    <button
      type="button"
      onClick={vis.toggle}
      aria-pressed={vis.visible}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--card))',
        color: 'hsl(var(--foreground))',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {vis.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      {vis.visible ? t('hideAll') : t('showAll')}
    </button>
  );
}

interface CiteProps {
  title?: string;
  url?: string;
  children?: ReactNode;
}

export function Cite({ title, url, children }: CiteProps) {
  const vis = useContext(VisibilityContext);
  const counter = useContext(CounterContext);
  const [open, setOpen] = useState(false);
  // 序号只在挂载时取一次，不随重渲染重新取号。
  const n = useMemo(() => counter?.next() ?? 0, [counter]);

  if (!vis?.visible) return null;

  return (
    <span style={{ position: 'relative' }}>
      <sup>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{
            border: 'none',
            background: 'none',
            padding: 0,
            color: 'hsl(var(--primary))',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '0.85em',
          }}
        >
          [{n}]
        </button>
      </sup>
      {open && (
        <span
          role="note"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: '100%',
            left: 0,
            minWidth: 200,
            maxWidth: 320,
            marginTop: 4,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            fontSize: 13,
            lineHeight: 1.5,
            boxShadow: '0 4px 16px hsl(var(--foreground) / 0.12)',
          }}
        >
          {title && <strong style={{ display: 'block' }}>{title}</strong>}
          {children && <span style={{ display: 'block' }}>{children}</span>}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 4, color: 'hsl(var(--primary))', wordBreak: 'break-all' }}
            >
              {url}
            </a>
          )}
        </span>
      )}
    </span>
  );
}
