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
import { GridProvider, useGridContext } from '@/contexts/GridContext';

function BaziGrid({ profileId }: { profileId: string }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(120);
  const { expandedCards } = useGridContext()!;

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const calc = (w: number) => {
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

  const baziExtraRows = expandedCards.get('bazi-chart') ?? 0;
  const gap = 16;

  return (
    <div ref={outerRef} className="w-full px-4 py-6">
      <div
        className="max-w-xl mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: `${cellSize}px`,
          gap: `${gap}px`,
        }}
      >
        <div style={{ gridColumn: '1 / span 4', gridRow: `1 / span ${2 + baziExtraRows}` }}>
          <BaziChartCard profileId={profileId} />
        </div>
        <div style={{ gridColumn: '1 / span 2', gridRow: `${3 + baziExtraRows} / span 2` }}>
          <WuxingRadarCard profileId={profileId} />
        </div>
        <div style={{ gridColumn: '3 / span 2', gridRow: `${3 + baziExtraRows} / span 3` }}>
          <DayMasterCard profileId={profileId} />
        </div>
        <div style={{ gridColumn: '1 / span 2', gridRow: `${5 + baziExtraRows} / span 1` }}>
          <BaziReadingCard profileId={profileId} />
        </div>
      </div>
    </div>
  );
}

export default function BaziPage() {
  const router = useRouter();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();

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
    <GridProvider>
      <BaziGrid profileId={currentProfile.id} />
    </GridProvider>
  );
}
