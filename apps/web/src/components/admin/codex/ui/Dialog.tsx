'use client';

import type { ReactNode } from 'react';

// 统一样式的弹窗外框，第八轮施工要求"重命名/移动/创建子类/创建词条/删除"这几个
// 操作共用同一套弹窗视觉——这个组件只负责外框（背景遮罩+居中卡片+标题+关闭），
// 具体表单内容由调用方通过children传入。全部用CSS变量配色，跟着后台的
// 深色/浅色主题切换走，不写死颜色。
export function Dialog({
  title,
  onClose,
  children,
  width = 360,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '90vw',
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 style={{ fontSize: 15, marginBottom: 14, fontWeight: 600 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function DialogField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          fontSize: 13,
        }}
      />
    </label>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>{children}</div>;
}

export function DialogButton({
  variant = 'default',
  onClick,
  disabled,
  children,
}: {
  variant?: 'default' | 'primary' | 'destructive';
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: 'transparent',
      border: '1px solid hsl(var(--border))',
      color: 'hsl(var(--foreground))',
    },
    primary: {
      background: 'hsl(var(--color-accent))',
      border: 'none',
      color: '#fff',
    },
    destructive: {
      background: 'hsl(var(--destructive))',
      border: 'none',
      color: 'hsl(var(--destructive-foreground))',
    },
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '7px 16px',
        borderRadius: 8,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}
