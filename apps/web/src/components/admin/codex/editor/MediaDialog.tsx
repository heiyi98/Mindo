'use client';

import { useState } from 'react';
import { Dialog, DialogActions, DialogButton } from '@/components/admin/codex/ui/Dialog';
import type { MediaAttrs, MediaAlign, MediaSize } from './MediaNode';

const SIZE_OPTIONS: { value: MediaSize; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
  { value: 'full', label: '通栏' },
];

const ALIGN_OPTIONS: { value: MediaAlign; label: string }[] = [
  { value: 'left', label: '居左' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '居右' },
  { value: 'full', label: '通栏' },
];

// 图片/媒体的插入和编辑共用同一个弹窗——插入时先在这里把url/尺寸/对齐都
// 定好，确认了才真正往正文里插节点，节点从出生起就是完整数据，不会经历
// "先插入个空节点、再在正文里原地补链接"这种中间状态，第八轮施工排查的
// "插入后不显示"那个bug就是从这类中间状态来的隐患，这次从设计上直接绕开。
export function MediaDialog({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: MediaAttrs;
  onConfirm: (attrs: MediaAttrs) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initial.url ?? '');
  const [size, setSize] = useState<MediaSize>(initial.size);
  const [align, setAlign] = useState<MediaAlign>(initial.align);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!url.trim()) {
      setError('请粘贴图片或视频链接');
      return;
    }
    onConfirm({ url: url.trim(), size, align });
  }

  const buttonRow = (
    options: { value: string; label: string }[],
    selected: string,
    onSelect: (value: string) => void
  ) => (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            fontSize: 12,
            border: '1px solid hsl(var(--border))',
            background: selected === opt.value ? 'hsl(var(--color-accent))' : 'transparent',
            color: selected === opt.value ? '#fff' : 'hsl(var(--foreground))',
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <Dialog title="图片 / 视频" onClose={onCancel} width={380}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>媒体链接</span>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="粘贴图片或视频链接"
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

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>尺寸</div>
        {buttonRow(SIZE_OPTIONS, size, (v) => setSize(v as MediaSize))}
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>对齐方式</div>
        {buttonRow(ALIGN_OPTIONS, align, (v) => setAlign(v as MediaAlign))}
      </div>

      {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 12, marginTop: 10 }}>{error}</div>}

      <DialogActions>
        <DialogButton onClick={onCancel}>取消</DialogButton>
        <DialogButton variant="primary" onClick={confirm}>
          确定
        </DialogButton>
      </DialogActions>
    </Dialog>
  );
}
