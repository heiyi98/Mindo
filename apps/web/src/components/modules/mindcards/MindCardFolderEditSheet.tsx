'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import BottomSheetPopover from './BottomSheetPopover';

export type FolderVisibility = 'private' | 'followers' | 'friends' | 'public';

export interface EditableFolder {
  id: string;
  name: string;
  description: string | null;
  visibility: FolderVisibility;
  is_default: boolean;
}

interface MindCardFolderEditSheetProps {
  folder: EditableFolder | null;
  onClose: () => void;
  onSaved: (updated: EditableFolder) => void;
}

export default function MindCardFolderEditSheet({ folder, onClose, onSaved }: MindCardFolderEditSheetProps) {
  const t = useTranslations('mindcards');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<FolderVisibility>('private');

  useEffect(() => {
    if (!folder) return;
    setName(folder.name);
    setDescription(folder.description ?? '');
    setVisibility(folder.visibility);
  }, [folder]);

  if (!folder) return null;

  const save = () => {
    const body: Record<string, unknown> = { visibility };
    if (!folder.is_default) {
      body.name = name.trim();
      body.description = description;
    }

    fetch(`/api/mind-cards/folders/${folder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.folder) onSaved({ ...folder, ...d.folder });
      });
  };

  return (
    <BottomSheetPopover open={!!folder} onClose={onClose}>
      <div className="space-y-3">
        {folder.is_default ? (
          // 默认收藏夹不可改名/改介绍：直接不渲染这两个输入框，不靠点击后弹提示文案说明限制
          <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t('folders.default.name')}</p>
        ) : (
          <>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('folderForm.namePlaceholder')}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('folderForm.descriptionPlaceholder')}
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent resize-none"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
          </>
        )}
        <div className="flex flex-wrap gap-1.5">
          {(['public', 'followers', 'friends', 'private'] as const).map((v) => (
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
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
          >
            {t('folders.save')}
          </button>
        </div>
      </div>
    </BottomSheetPopover>
  );
}