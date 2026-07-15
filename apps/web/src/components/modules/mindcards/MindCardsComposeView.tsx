'use client';
import '@/styles/mind-fonts.module.css';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ChevronLeft } from 'lucide-react';
import RichTextComposer, { type RichTextComposerHandle } from './RichTextComposer';

export default function MindCardsComposeView() {
  const t = useTranslations('mindcards');
  const router = useRouter();
  const composerRef = useRef<RichTextComposerHandle>(null);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = () => {
    if (publishing) return;
    const payload = composerRef.current?.publish();
    if (!payload) return;

    setPublishing(true);
    fetch('/api/mind-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then(() => {
        router.replace('/dashboard/mind-cards');
      })
      .finally(() => setPublishing(false));
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: 'hsl(var(--background))', borderBottom: '1px solid hsl(var(--border) / 0.4)' }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-4 py-1.5 rounded-xl text-sm font-medium disabled:opacity-40"
          style={{ background: 'hsl(var(--foreground) / 0.08)', color: 'hsl(var(--foreground))' }}
        >
          {t('composer.publish')}
        </button>
      </div>

      <div className="w-full max-w-xl mx-auto px-4 pt-16 pb-8">
        <RichTextComposer ref={composerRef} />
      </div>
    </div>
  );
}
