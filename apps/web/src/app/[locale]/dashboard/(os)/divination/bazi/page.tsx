'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import BaziChartCard from '@/components/modules/bazi/BaziChartCard';
import WuxingRadarCard from '@/components/modules/bazi/WuxingRadarCard';
import DayMasterCard from '@/components/modules/bazi/DayMasterCard';
import BaziReadingCard from '@/components/modules/bazi/BaziReadingCard';

export default function BaziPage() {
  const router = useRouter();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();
  const outerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(120);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const calc = (w: number) => {
      // max-w-xl = 576px，减去 px-4 两侧(32px)，按4列计算
      const contentW = Math.min(w - 32, 576);
      setCellSize(Math.floor((contentW - 3 * 16) / 4));
    };
    calc(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) calc(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setContent({
      left: (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <ProfileSwitcher />
        </div>
      ),
    });
    return () => setContent({});
  }, [setContent, router]);

  if (!currentProfile) return null;

  return (
    <div ref={outerRef} className="w-full px-4 py-6">
      <div
        className="max-w-xl mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: `${cellSize}px`,
          gap: '16px',
        }}
      >
        <div style={{ gridColumn: '1 / span 4', gridRow: '1 / span 2' }}>
          <BaziChartCard profileId={currentProfile.id} />
        </div>
        <div style={{ gridColumn: '1 / span 2', gridRow: '3 / span 2' }}>
          <WuxingRadarCard profileId={currentProfile.id} />
        </div>
        <div style={{ gridColumn: '3 / span 2', gridRow: '3 / span 3' }}>
          <DayMasterCard profileId={currentProfile.id} />
        </div>
        <div style={{ gridColumn: '1 / span 2', gridRow: '5 / span 1' }}>
          <BaziReadingCard profileId={currentProfile.id} />
        </div>
      </div>
    </div>
  );
}