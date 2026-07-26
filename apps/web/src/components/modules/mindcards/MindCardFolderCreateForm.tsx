'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookText, BookImage, Notebook } from 'lucide-react';

export type MindCardFolderVisibility = 'private' | 'followers' | 'friends' | 'public';
export type MindCardFolderDisplayMode = 'album' | 'stack';
export type MindCardFolderKind = 'collection' | 'notebook';
// 表单里三个互斥按钮的选择——不是简单的display_mode二选一，"本"没有display_mode
// 这个维度（folder_kind='notebook'时display_mode恒为null），所以要单独一个
// 类型覆盖三种可能，不能只在album/stack之间选。
type FormSelection = 'album' | 'stack' | 'notebook';

export interface CreatedMindCardFolder {
  id: string;
  name: string;
  description: string | null;
  folder_kind: MindCardFolderKind;
  display_mode: MindCardFolderDisplayMode | null;
  visibility: MindCardFolderVisibility;
  is_default: boolean;
}

interface MindCardFolderCreateFormProps {
  onCreated: (folder: CreatedMindCardFolder) => void;
  onCancel: () => void;
}

const VISIBILITY_OPTIONS: MindCardFolderVisibility[] = ['public', 'followers', 'friends', 'private'];

// 新建卡片集表单——收藏多选窗口和个人页"卡片集"栏的新建入口共用同一份逻辑，不重复实现两套。
export default function MindCardFolderCreateForm({ onCreated, onCancel }: MindCardFolderCreateFormProps) {
  const t = useTranslations('mindcards');
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<MindCardFolderVisibility | null>(null);
  const [selection, setSelection] = useState<FormSelection | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || !visibility || !selection || submitting) return;
    setSubmitting(true);
    const body = selection === 'notebook'
      ? { name: trimmed, folder_kind: 'notebook', visibility }
      : { name: trimmed, folder_kind: 'collection', display_mode: selection, visibility };
    fetch('/api/mind-cards/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.folder) onCreated(d.folder);
      })
      .finally(() => setSubmitting(false));
  };

  const disabled = !name.trim() || !visibility || !selection || submitting;

  return (
    <div className="px-2 py-3 space-y-3 rounded-xl" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('folderForm.namePlaceholder')}
        className="w-full text-sm px-3 py-2 rounded-lg bg-transparent"
        style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSelection('album')}
          className="flex-1 flex flex-col items-center gap-1 text-xs px-2 py-2 rounded-lg"
          style={{
            border: '1px solid hsl(var(--border))',
            background: selection === 'album' ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
            color: 'hsl(var(--foreground))',
          }}
        >
          <BookText size={16} />
          {t('folderKind.collection.album.label')}
        </button>
        <button
          type="button"
          onClick={() => setSelection('stack')}
          className="flex-1 flex flex-col items-center gap-1 text-xs px-2 py-2 rounded-lg"
          style={{
            border: '1px solid hsl(var(--border))',
            background: selection === 'stack' ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
            color: 'hsl(var(--foreground))',
          }}
        >
          <BookImage size={16} />
          {t('folderKind.collection.stack.label')}
        </button>
        <button
          type="button"
          onClick={() => setSelection('notebook')}
          className="flex-1 flex flex-col items-center gap-1 text-xs px-2 py-2 rounded-lg"
          style={{
            border: '1px solid hsl(var(--border))',
            background: selection === 'notebook' ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
            color: 'hsl(var(--foreground))',
          }}
        >
          <Notebook size={16} />
          {t('folderKind.notebook.label')}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {VISIBILITY_OPTIONS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVisibility(v)}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{
              border: '1px solid hsl(var(--border))',
              background: visibility === v ? 'hsl(var(--foreground) / 0.1)' : 'transparent',
              color: 'hsl(var(--foreground))',
            }}
          >
            {t(`folderVisibility.${v}`)}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {t('folders.cancel')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))', opacity: disabled ? 0.4 : 1 }}
        >
          {t('folders.create')}
        </button>
      </div>
    </div>
  );
}
