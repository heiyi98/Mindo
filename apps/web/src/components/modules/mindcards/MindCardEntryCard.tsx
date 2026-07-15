'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { MessageSquareText } from 'lucide-react';

export const COLS = 1;
export const ROWS = 2;
export const CARD_META = { id: 'mind-cards', cols: COLS, rows: ROWS, module: 'mindcards' };

export default function MindCardEntryCard({ profileId: _profileId }: { profileId: string }) {
  const t = useTranslations('mindcards');
  const router = useRouter();

  return (
    <div
      className="rounded-2xl flex items-center justify-center cursor-pointer"
      onClick={() => router.push('/dashboard/mind-cards')}
      style={{
        width: '100%',
        height: '100%',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div
        className="flex flex-col items-center gap-2 px-4 py-2 rounded-xl text-sm font-light"
        style={{ color: 'hsl(var(--foreground))' }}
      >
        <MessageSquareText size={18} />
        {t('entryCard.title')}
      </div>
    </div>
  );
}
