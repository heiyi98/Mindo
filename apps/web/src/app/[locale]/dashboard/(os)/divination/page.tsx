'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { Brain, Layers, Wand2, Map as MapIcon } from 'lucide-react';

// 自定义图标
function BaziIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <mask id="bazi-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32" style={{ maskType: 'luminance' }}>
        <path d="M32 0H0V32H32V0Z" fill="black"/>
        <path d="M30 7.5H2a2 2 0 00-2 2v13a2 2 0 002 2h28a2 2 0 002-2v-13a2 2 0 00-2-2Z" fill="white"/>
        <path d="M7.5 9.5H2V15h5.5V9.5ZM15 9.5H9.5V15H15V9.5ZM30 9.5h-5.5V15H30V9.5ZM7.5 17H2v5.5h5.5V17ZM15 17H9.5v5.5H15V17ZM22.5 17H17v5.5h5.5V17ZM30 17h-5.5v5.5H30V17Z" fill="black"/>
      </mask>
      <g mask="url(#bazi-mask)">
        <path d="M32 0H0V32H32V0Z" fill="currentColor"/>
      </g>
    </svg>
  );
}

function ZiweiIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <mask id="ziwei-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32" style={{ maskType: 'luminance' }}>
        <path d="M32 0H0V32H32V0Z" fill="black"/>
        <path d="M27 3H5a2 2 0 00-2 2v22a2 2 0 002 2h22a2 2 0 002-2V5a2 2 0 00-2-2Z" fill="white"/>
        <path d="M9 5H5v4h4V5ZM15 5h-4v4h4V5ZM21 5h-4v4h4V5ZM27 5h-4v4h4V5ZM9 11H5v4h4v-4ZM27 11h-4v4h4v-4ZM9 17H5v4h4v-4ZM27 17h-4v4h4v-4ZM21 11H11v10h10V11ZM15 23h-4v4h4v-4ZM21 23h-4v4h4v-4ZM27 23h-4v4h4v-4Z" fill="black"/>
      </mask>
      <g mask="url(#ziwei-mask)">
        <path d="M32 0H0V32H32V0Z" fill="currentColor"/>
      </g>
    </svg>
  );
}

function WesternIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <mask id="western-mask" maskUnits="userSpaceOnUse" x="-21" y="-21" width="74" height="74" style={{ maskType: 'luminance' }}>
        <path d="M32 0H0V32H32V0Z" fill="black"/>
        <path d="M16 16H0C0 18.81.74 21.57 2.14 24L16 16Z" fill="white"/>
        <circle cx="16" cy="16" r="12" stroke="white" strokeWidth="2" fill="none"/>
        <circle cx="16" cy="16" r="5" stroke="white" strokeWidth="2" fill="none"/>
        <line x1="0" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2"/>
        <line x1="2.14" y1="8" x2="29.86" y2="24" stroke="white" strokeWidth="2"/>
        <line x1="8" y1="2.14" x2="24" y2="29.86" stroke="white" strokeWidth="2"/>
        <line x1="16" y1="0" x2="16" y2="32" stroke="white" strokeWidth="2"/>
        <line x1="24" y1="2.14" x2="8" y2="29.86" stroke="white" strokeWidth="2"/>
        <line x1="29.86" y1="8" x2="2.14" y2="24" stroke="white" strokeWidth="2"/>
        <circle cx="16" cy="16" r="4" fill="black"/>
        <circle cx="16" cy="16" r="25" stroke="black" strokeWidth="24" fill="none"/>
      </mask>
      <g mask="url(#western-mask)">
        <path d="M32 0H0V32H32V0Z" fill="currentColor"/>
      </g>
    </svg>
  );
}
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';

type CardStatus = 'active' | 'coming_soon';
type CardColor = 'indigo' | 'emerald' | 'amber';

interface CardDef {
  id: string;
  nameKey: string;
  descKey: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  href?: string;
  status: CardStatus;
  color: CardColor;
}

const PALETTES: Record<CardColor | 'gray', { bg: string; fg: string }> = {
  indigo: { bg: 'rgba(99,102,241,0.12)', fg: '#818cf8' },
  emerald: { bg: 'rgba(16,185,129,0.12)', fg: '#34d399' },
  amber: { bg: 'rgba(245,158,11,0.12)', fg: '#fbbf24' },
  gray: { bg: 'rgba(107,114,128,0.1)', fg: '#9ca3af' },
};

const CATEGORIES: { key: string; labelKey: string; cards: CardDef[] }[] = [
  {
    key: 'destiny',
    labelKey: 'divination.destiny',
    cards: [
      {
        id: 'bazi',
        nameKey: 'assessments.bazi.name',
        descKey: 'assessments.divination.bazi.desc',
        Icon: BaziIcon,
        href: '/dashboard/divination/bazi',
        status: 'active',
        color: 'indigo',
      },
      {
        id: 'ziwei',
        nameKey: 'assessments.ziwei.name',
        descKey: 'assessments.divination.ziwei.desc',
        Icon: ZiweiIcon,
        status: 'coming_soon',
        color: 'indigo',
      },
      {
        id: 'western',
        nameKey: 'assessments.western.name',
        descKey: 'assessments.divination.western.desc',
        Icon: WesternIcon,
        href: '/dashboard/divination/western',
        status: 'active',
        color: 'indigo',
      },
    ],
  },
  {
    key: 'psychology',
    labelKey: 'divination.psychology',
    cards: [
      {
        id: 'bigfive',
        nameKey: 'assessments.bigfive.name',
        descKey: 'assessments.divination.bigfive.desc',
        Icon: Brain,
        href: '/dashboard/divination/bigfive',
        status: 'active',
        color: 'emerald',
      },
    ],
  },
  {
    key: 'oracle',
    labelKey: 'divination.oracle',
    cards: [
      {
        id: 'liuyao',
        nameKey: 'assessments.liuyao.name',
        descKey: '',
        Icon: Layers,
        status: 'coming_soon',
        color: 'amber',
      },
      {
        id: 'tarot',
        nameKey: 'assessments.tarot.name',
        descKey: '',
        Icon: Wand2,
        status: 'coming_soon',
        color: 'amber',
      },
      {
        id: 'geomancy',
        nameKey: 'assessments.geomancy.name',
        descKey: '',
        Icon: MapIcon,
        status: 'coming_soon',
        color: 'amber',
      },
    ],
  },
];

interface StatusEntry {
  id: string;
  isCompleted: boolean;
}

export default function DivinationPage() {
  const t = useTranslations();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();
  const [statusMap, setStatusMap] = useState<Map<string, StatusEntry>>(new Map());

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

  useEffect(() => {
    if (!currentProfile) return;
    fetch(`/api/assessments/status?profile_id=${currentProfile.id}`)
      .then(r => r.json())
      .then(d => {
        const m = new Map<string, StatusEntry>(
          (d.status || []).map((s: StatusEntry) => [s.id, s])
        );
        setStatusMap(m);
      })
      .catch(console.error);
  }, [currentProfile?.id]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-light tracking-[0.3em] uppercase"
        style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
      >
        {t('divination.title')}
      </motion.h1>

      {CATEGORIES.map(({ key, labelKey, cards }) => (
        <motion.section
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p
            className="text-xs font-light tracking-[0.2em] uppercase mb-3"
            style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}
          >
            {t(labelKey as any)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {cards.map(card => {
              const entry = statusMap.get(card.id);
              const isCompleted = entry?.isCompleted ?? false;
              const isActive = card.status === 'active';
              const palette = isActive && isCompleted
                ? PALETTES[card.color]
                : PALETTES.gray;

              const inner = (
                <div
                  className="rounded-2xl p-5 h-full flex flex-col gap-2"
                  style={
                    isActive
                      ? {
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                        }
                      : {
                          background: 'hsl(var(--muted) / 0.3)',
                          border: '1px dashed hsl(var(--border))',
                          opacity: 0.6,
                        }
                  }
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: palette.bg }}
                    >
                      <card.Icon size={18} style={{ color: palette.fg }} />
                    </div>
                    {isActive && isCompleted && (
                      <div
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ background: '#22c55e' }}
                      />
                    )}
                    {!isActive && (
                      <span
                        className="text-[10px] font-light px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: 'hsl(var(--muted))',
                          color: 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {t('divination.comingSoon')}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-sm font-light"
                    style={{ color: 'hsl(var(--foreground))' }}
                  >
                    {t(card.nameKey as any)}
                  </span>
                  {card.descKey ? (
                    <span
                      className="text-xs font-light leading-relaxed"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {t(card.descKey as any)}
                    </span>
                  ) : null}
                </div>
              );

              if (isActive && card.href) {
                return (
                  <Link
                    key={card.id}
                    href={card.href as any}
                    className="block transition-transform duration-200 hover:scale-[1.02]"
                    style={{ textDecoration: 'none' }}
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <div key={card.id} style={{ cursor: 'not-allowed' }}>
                  {inner}
                </div>
              );
            })}
          </div>
        </motion.section>
      ))}
    </div>
  );
}