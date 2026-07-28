'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import BottomSheetPopover from './BottomSheetPopover';
import {
  MIND_CARD_FOLDER_NAME_MAX_LENGTH, MIND_CARD_FOLDER_DESCRIPTION_MAX_LENGTH, truncateToGraphemes,
} from '@/lib/mindCards/textLength';

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

  const saveMutation = useMutation({
    mutationFn: async (vars: { folderId: string; body: Record<string, unknown> }) => {
      const res = await fetch(`/api/mind-cards/folders/${vars.folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) throw new Error('request failed');
      return res.json() as Promise<{ folder?: Partial<EditableFolder> }>;
    },
    onSuccess: (d) => {
      if (folder && d.folder) onSaved({ ...folder, ...d.folder });
    },
  });

  if (!folder) return null;

  const save = () => {
    const body: Record<string, unknown> = { visibility };
    if (!folder.is_default) {
      body.name = name.trim();
      body.description = description;
    }
    saveMutation.mutate({ folderId: folder.id, body });
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
              onChange={(e) => setName(truncateToGraphemes(e.target.value, MIND_CARD_FOLDER_NAME_MAX_LENGTH))}
              placeholder={t('folderForm.namePlaceholder')}
              maxLength={MIND_CARD_FOLDER_NAME_MAX_LENGTH * 8}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(truncateToGraphemes(e.target.value, MIND_CARD_FOLDER_DESCRIPTION_MAX_LENGTH))}
              placeholder={t('folderForm.descriptionPlaceholder')}
              rows={3}
              maxLength={MIND_CARD_FOLDER_DESCRIPTION_MAX_LENGTH * 8}
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