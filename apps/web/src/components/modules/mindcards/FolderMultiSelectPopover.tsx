'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, BookText, BookImage, BookHeart, Notebook } from 'lucide-react';
import BottomSheetPopover from './BottomSheetPopover';
import MindCardFolderCreateForm, { type CreatedMindCardFolder } from './MindCardFolderCreateForm';

type DisplayMode = 'album' | 'stack';
type FolderKind = 'collection' | 'notebook';

interface FolderStatusRow {
  id: string;
  name: string;
  folder_kind: FolderKind;
  display_mode: DisplayMode | null;
  is_default: boolean;
  checked: boolean;
}

interface FolderMultiSelectPopoverProps {
  open: boolean;
  cardId: string;
  onClose: () => void;
  // 每次勾选状态变化都回调一次，父组件据此保持card.favorited与"任意一个夹被勾选"同步
  onFavoritedChange: (favorited: boolean) => void;
}

export default function FolderMultiSelectPopover({
  open, cardId, onClose, onFavoritedChange,
}: FolderMultiSelectPopoverProps) {
  const t = useTranslations('mindcards');
  const [folders, setFolders] = useState<FolderStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  // "本"类型的夹勾选时需要当场写一段批语——记录正在等待用户输入批语的
  // 那个夹id，输入框单独弹出，跟其他夹的"点了立刻生效"不是同一套交互。
  const [annotationPrompt, setAnnotationPrompt] = useState<{ folderId: string } | null>(null);
  const [annotationValue, setAnnotationValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/mind-cards/${cardId}/folder-status`)
      .then((r) => r.json())
      .then((d) => setFolders(d.folders ?? []))
      .finally(() => setLoading(false));
  }, [open, cardId]);

  if (!open) return null;

  const notifyFavorited = (rows: FolderStatusRow[]) => {
    onFavoritedChange(rows.some((f) => f.checked));
  };

  const submitToggle = async (folderId: string, checked: boolean, annotation?: string) => {
    // 先把界面改成用户点击后应有的样子，给出即时反馈；但这只是"乐观"状态，
    // 不代表后端真的写入成功了——请求结果出来之前，界面显示的是"预期"，
    // 不是"事实"。
    const optimistic = folders.map((f) => (f.id === folderId ? { ...f, checked: !checked } : f));
    setFolders(optimistic);
    notifyFavorited(optimistic);

    try {
      const res = await fetch(`/api/mind-cards/${cardId}/folders/${folderId}`, {
        method: checked ? 'DELETE' : 'POST',
        ...(checked ? {} : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ annotation }),
        }),
      });
      if (res.ok) return;
      throw new Error(`request failed with status ${res.status}`);
    } catch (err) {
      // 后端没有真的写入成功：把界面状态悄悄改回点击前的样子，不弹错误提示——
      // 用户只会看到"点了但没有真的亮起来"这一个结果，不额外打扰。
      // 注意：notifyFavorited会触发父组件的setState，不能写在setFolders的
      // 更新函数内部（那样等于在React计算这次state更新的过程中，顺带去触发
      // 另一个组件的state更新，React不允许这样做）。这里先把要回滚成的结果
      // 算成一个普通值，再依次分开调用setFolders和notifyFavorited。
      console.error('[FolderMultiSelectPopover] toggle failed:', err);
      const reverted = optimistic.map((f) => (f.id === folderId ? { ...f, checked } : f));
      setFolders(reverted);
      notifyFavorited(reverted);
    }
  };

  const toggle = (folder: FolderStatusRow) => {
    if (!folder.checked && folder.folder_kind === 'notebook') {
      // 勾选"本"：先弹批语输入框，写完再一起提交，不是点了立刻生效
      setAnnotationValue('');
      setAnnotationPrompt({ folderId: folder.id });
      return;
    }
    submitToggle(folder.id, folder.checked);
  };

  const confirmAnnotation = () => {
    if (!annotationPrompt) return;
    const { folderId } = annotationPrompt;
    const annotation = annotationValue.trim();
    setAnnotationPrompt(null);
    submitToggle(folderId, false, annotation || undefined);
  };

  const handleCreated = (folder: CreatedMindCardFolder) => {
    const row: FolderStatusRow = {
      id: folder.id,
      name: folder.name,
      folder_kind: folder.folder_kind,
      display_mode: folder.display_mode,
      is_default: false,
      checked: folder.folder_kind !== 'notebook',
    };
    const next = [...folders, row];
    setFolders(next);
    notifyFavorited(next);
    setCreating(false);
    if (folder.folder_kind === 'notebook') {
      // 刚新建的"本"同样需要当场写批语，不直接静默入夹
      setAnnotationValue('');
      setAnnotationPrompt({ folderId: row.id });
      return;
    }
    fetch(`/api/mind-cards/${cardId}/folders/${row.id}`, { method: 'POST' });
  };

  return (
    <BottomSheetPopover open={open} onClose={onClose}>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        <div className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>
          {t('collectPopover.title')}
        </div>

        {loading && (
          <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('folders.loading')}
          </p>
        )}

        {!loading && folders.length === 0 && !creating && (
          <p className="text-xs py-4 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('collectPopover.emptyState')}
          </p>
        )}

        {!loading && folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => toggle(f)}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left"
          >
            <span
              className="flex items-center justify-center rounded-md flex-shrink-0"
              style={{
                width: 20, height: 20,
                border: f.checked ? 'none' : '1px solid hsl(var(--border))',
                background: f.checked ? 'hsl(var(--foreground))' : 'transparent',
                color: 'hsl(var(--background))',
              }}
            >
              {f.checked && <Check size={13} />}
            </span>
            {f.is_default
              ? <BookHeart size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
              : f.folder_kind === 'notebook'
                ? <Notebook size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
                : f.display_mode === 'stack'
                  ? <BookImage size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />
                  : <BookText size={15} style={{ color: 'hsl(var(--muted-foreground))' }} />}
            <span className="text-sm flex-1" style={{ color: 'hsl(var(--foreground))' }}>
              {f.is_default ? t('folders.default.name') : f.name}
            </span>
          </button>
        ))}

        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full text-left text-sm px-2 py-2.5 rounded-xl"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            + {t('collectPopover.createNew')}
          </button>
        )}

        {creating && (
          <MindCardFolderCreateForm onCreated={handleCreated} onCancel={() => setCreating(false)} />
        )}

        {annotationPrompt && (
          <div className="px-2 py-3 space-y-2 rounded-xl" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
            <textarea
              autoFocus
              value={annotationValue}
              onChange={(e) => setAnnotationValue(e.target.value)}
              placeholder={t('notebook.annotationPlaceholder')}
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg bg-transparent resize-none"
              style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAnnotationPrompt(null)}
                className="text-xs px-3 py-1.5"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {t('folders.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmAnnotation}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
              >
                {t('folders.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheetPopover>
  );
}
