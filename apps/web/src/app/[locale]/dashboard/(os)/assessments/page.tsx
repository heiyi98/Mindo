'use client';
import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { Layers, Wand2, Map as MapIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import { useDashboardData } from '@/hooks/queries/useDashboardData';
import { getWuxingColor } from '@/lib/wuxing-colors';
import { BIGFIVE_COLORS } from '@/lib/bigfive-constants';
import { getAssessmentById } from '@/config/assessments';

// ---------------- 图标组件库 ----------------

function BaziIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
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

function ZiweiIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
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

function WesternIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
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

function BigFiveIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <g clipPath="url(#clip0_47_2)">
        <mask id="mask0_47_2" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <path d="M32 0H0V32H32V0Z" fill="white"/>
          <mask id="mask1_47_2" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="-7" y="-4" width="46" height="43">
            <path d="M32 0H0V32H32V0Z" fill="white"/>
            <path d="M16 16L16 36" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none"/>
            <path d="M16 16L-3.01997 22.18" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none"/>
            <path d="M16 16L4.24003 -0.18" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none"/>
            <path d="M16 16L27.76 -0.18" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none"/>
            <path d="M16 16L35.02 22.18" stroke="black" strokeWidth="6" strokeLinecap="round" fill="none"/>
          </mask>
          <g mask="url(#mask1_47_2)">
            <path d="M16 25.1875C21.0741 25.1875 25.1875 21.0741 25.1875 16C25.1875 10.9259 21.0741 6.8125 16 6.8125C10.9259 6.8125 6.8125 10.9259 6.8125 16C6.8125 21.0741 10.9259 25.1875 16 25.1875Z" stroke="black" strokeWidth="5.625" fill="none"/>
          </g>
        </mask>
        <g mask="url(#mask0_47_2)">
          <mask id="mask2_47_2" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="-5" y="-2" width="42" height="39">
            <path d="M32 0H0V32H32V0Z" fill="white"/>
            <path d="M16 16L16 36" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M16 16L-3.01997 22.18" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M16 16L4.24003 -0.18" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M16 16L27.76 -0.18" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M16 16L35.02 22.18" stroke="black" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </mask>
          <g mask="url(#mask2_47_2)">
            <path d="M16 25.1875C21.0741 25.1875 25.1875 21.0741 25.1875 16C25.1875 10.9259 21.0741 6.8125 16 6.8125C10.9259 6.8125 6.8125 10.9259 6.8125 16C6.8125 21.0741 10.9259 25.1875 16 25.1875Z" stroke="currentColor" strokeWidth="9.625" fill="none"/>
          </g>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_47_2">
          <rect width="32" height="32" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}

// 每日随机卦象计算
function HexagramIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  const seed = new Date().toDateString();
  // 简单的哈希生成 0-63
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hexagram = hash % 64; 
  const lines = hexagram.toString(2).padStart(6, '0').split(''); // 6位二进制

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {lines.map((bit, i) => {
        const y = 26 - i * 4;
        return bit === '1' ? (
          <path key={i} d={`M4 ${y}H28`} stroke="currentColor" strokeWidth="2" />
        ) : (
          <g key={i}>
            <path d={`M4 ${y}H14`} stroke="currentColor" strokeWidth="2" />
            <path d={`M18 ${y}H28`} stroke="currentColor" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------- 数据定义 ----------------

// status字段现在只作为「不在 config/assessments.ts 注册表里的卡片」的兜底
// （目前只有六爻 liuyao 这一种情况）。凡是在注册表里登记过的卡片，
// 能不能点、要不要显示"即将推出"，一律去问 getAssessmentById(id).isAvailable，
// 不再由这里的 status 字段决定——避免这次western卡片踩过的"两处状态各记一份、
// 改了一处另一处没同步"的问题。
type CardStatus = 'active' | 'coming_soon';

interface CardDef {
  id: string;
  nameKey: string;
  descKey: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  href?: string;
  status?: CardStatus;
}

const CATEGORIES: { key: string; labelKey: string; cards: CardDef[] }[] = [
  {
    key: 'destiny',
    labelKey: 'assessments.destiny',
    cards: [
      {
        id: 'bazi',
        nameKey: 'assessments.bazi.name',
        descKey: 'assessments.bazi.desc',
        Icon: BaziIcon,
        href: '/dashboard/assessments/bazi',
      },
      {
        id: 'western',
        nameKey: 'assessments.western.name',
        descKey: 'assessments.western.desc',
        Icon: WesternIcon,
        href: '/dashboard/assessments/western',
      },
      {
        id: 'ziwei',
        nameKey: 'assessments.ziwei.name',
        descKey: 'assessments.ziwei.desc',
        Icon: ZiweiIcon,
      },
    ],
  },
  {
    key: 'psychology',
    labelKey: 'assessments.psychology',
    cards: [
      {
        id: 'bigfive',
        nameKey: 'assessments.bigfive.name',
        descKey: 'assessments.bigfive.desc',
        Icon: BigFiveIcon,
        href: '/dashboard/assessments/bigfive',
      },
    ],
  },
  {
    key: 'divination',
    labelKey: 'assessments.divination',
    cards: [
      {
        id: 'liuyao',
        nameKey: 'assessments.liuyao.name',
        descKey: 'assessments.liuyao.desc',
        Icon: HexagramIcon,
        status: 'coming_soon', // 六爻还没登记进 config/assessments.ts，暂时保留本地兜底
      },
    ],
  },
];

interface StatusEntry {
  id: string;
  isCompleted: boolean;
}

export default function AssessmentsPage() {
  const t = useTranslations();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

  const statusQuery = useQuery({
    queryKey: ['assessments-status', currentProfile?.id],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/status?profile_id=${currentProfile!.id}`);
      if (!res.ok) throw new Error('Failed to fetch assessments status');
      return res.json();
    },
    enabled: !!currentProfile,
  });
  const statusMap = useMemo(
    () => new Map<string, StatusEntry>((statusQuery.data?.status ?? []).map((s: StatusEntry) => [s.id, s])),
    [statusQuery.data]
  );
  const baziCompleted = statusMap.get('bazi')?.isCompleted ?? false;
  const bigfiveCompleted = statusMap.get('bigfive')?.isCompleted ?? false;

  // 命盘数据跟仪表盘卡片（ProfileCard/BaziChartCard等）共用同一份/api/dashboard
  // 缓存，只在八字已完成时才需要它，不需要自己单独再发一次请求。
  const { data: dashboardData } = useDashboardData(baziCompleted ? currentProfile?.id : undefined);
  // 大五结果跟BigFiveChart共用同一份缓存。
  const { data: bigfiveData } = useQuery({
    queryKey: ['bigfive-result', currentProfile?.id],
    queryFn: async () => {
      const res = await fetch(`/api/psychology/bigfive/result?profile_id=${currentProfile!.id}`);
      if (!res.ok) throw new Error('Failed to fetch bigfive result');
      return res.json();
    },
    enabled: !!currentProfile && bigfiveCompleted,
  });

  const cardColors = useMemo(() => {
    const colors: Record<string, string> = { western: 'hsl(var(--foreground))' };
    const wuxing = dashboardData?.bazi?.pillars?.tianGanNodes?.find((n: any) => n.pos === 'DayStem')?.wuxing;
    if (wuxing) colors['bazi'] = getWuxingColor(wuxing) || 'hsl(var(--foreground))';

    if (bigfiveData?.standard_scores?.domains) {
      const domains = bigfiveData.standard_scores.domains;
      let maxDomain = '';
      let maxScore = -Infinity;
      for (const [domain, entry] of Object.entries(domains)) {
        const score = (entry as any).t;
        if (score > maxScore) {
          maxScore = score;
          maxDomain = domain;
        }
      }
      if (maxDomain) colors['bigfive'] = BIGFIVE_COLORS[maxDomain as keyof typeof BIGFIVE_COLORS] || 'hsl(var(--foreground))';
    }
    return colors;
  }, [dashboardData, bigfiveData]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-10">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-light tracking-[0.3em] uppercase"
        style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
      >
        {t('assessments.title' as any)}
      </motion.h1>

      {CATEGORIES.map(({ key, labelKey, cards }) => (
        <motion.section
          key={key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p
            className="text-xs font-medium tracking-[0.2em] uppercase"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {t(labelKey as any)}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cards.map(card => {
              // 能不能点，优先问 config/assessments.ts 的 isAvailable（单一数据源）；
              // 只有不在那份注册表里的卡片（目前仅六爻），才退回本地的 status 字段兜底。
              const configEntry = getAssessmentById(card.id);
              const isActive = configEntry ? configEntry.isAvailable : card.status === 'active';

              const isCompleted = statusMap.get(card.id)?.isCompleted ?? false;
              
              const iconColor = (isActive && isCompleted && cardColors[card.id]) 
                ? cardColors[card.id] 
                : 'hsl(var(--muted-foreground) / 0.3)';
              
              const textColor = (isActive && isCompleted)
                ? 'hsl(var(--foreground))'
                : 'hsl(var(--muted-foreground) / 0.5)';

              const cardContent = (
                <div
                  className="rounded-2xl p-5 flex flex-col justify-between aspect-[5/2] transition-all"
                  style={
                    isActive && isCompleted
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
                    <div style={{ color: iconColor, transition: 'color 0.3s ease' }}>
                      <card.Icon size={26} />
                    </div>
                    {!isActive && (
                      <span
                        className="text-[10px] font-light px-2 py-0.5 rounded-full"
                        style={{
                          background: 'hsl(var(--muted))',
                          color: 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {t('common.underConstruction' as any)}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h3 
                      className="text-base font-light transition-colors"
                      style={{ color: textColor }}
                    >
                      {t(card.nameKey as any)}
                    </h3>
                    <div className="mt-1 h-10 flex items-start">
                      {card.descKey && (
                        <p 
                          className="text-xs font-light leading-relaxed line-clamp-2 transition-colors"
                          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                        >
                          {t(card.descKey as any)}
                        </p>
                      )}
                    </div>
                  </div>
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
                    {cardContent}
                  </Link>
                );
              }
              
              return (
                <div key={card.id} style={{ cursor: 'not-allowed' }}>
                  {cardContent}
                </div>
              );
            })}
          </div>
        </motion.section>
      ))}
    </div>
  );
}