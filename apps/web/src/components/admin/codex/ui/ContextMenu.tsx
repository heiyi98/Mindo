'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface Position {
  x: number;
  y: number;
}

/**
 * 右键菜单，通用组件——左侧类目树和右侧内容区共用同一份逻辑（第八轮施工明确
 * 要求"实现上应复用同一套组件，不要另写一份"）。用法：把 useContextMenu()
 * 挂在容器上拿到 onContextMenu 处理函数和当前菜单状态，菜单本身单独渲染一份
 * 挂在页面最外层（避免被父级 overflow/定位裁切）。
 */
export function useContextMenu() {
  const [state, setState] = useState<{ position: Position; items: ContextMenuItem[] } | null>(null);

  function open(e: React.MouseEvent, items: ContextMenuItem[]) {
    e.preventDefault();
    e.stopPropagation();
    setState({ position: { x: e.clientX, y: e.clientY }, items });
  }

  function close() {
    setState(null);
  }

  return { menuState: state, openContextMenu: open, closeContextMenu: close };
}

export function ContextMenuView({
  state,
  onClose,
}: {
  state: { position: Position; items: ContextMenuItem[] } | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: state.position.y,
        left: state.position.x,
        zIndex: 200,
        minWidth: 160,
        background: 'hsl(var(--popover))',
        color: 'hsl(var(--popover-foreground))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        padding: 4,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      {state.items.map((item, i) => (
        <button
          key={i}
          type="button"
          disabled={item.disabled}
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '7px 10px',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: item.disabled ? 'hsl(var(--muted-foreground))' : item.destructive ? 'hsl(var(--destructive))' : 'inherit',
            fontSize: 13,
            cursor: item.disabled ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) e.currentTarget.style.background = 'hsl(var(--accent))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function IconGhostButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: 'hsl(var(--foreground))',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
