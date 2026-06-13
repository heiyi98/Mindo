'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import { LifeKlineCard } from './LifeKlineCard';
import type { LifeTimelineData } from './LifeKlineCard';
import type { Wuxing } from '@mindo/core';

// ─── 静态数据 ────────────────────────────────────────────────────────────────

const STEM_PINYIN: Record<string, string> = {
  '甲': 'jia', '乙': 'yi', '丙': 'bing', '丁': 'ding', '戊': 'wu',
  '己': 'ji', '庚': 'geng', '辛': 'xin', '壬': 'ren', '癸': 'gui',
};

const ELEMENT_COLORS: Record<string, string> = {
  Wood:  '#10b981',
  Fire:  '#f43f5e',
  Earth: '#f59e0b',
  Metal: '#94a3b8',
  Water: '#3b82f6',
  gray:  '#6b7280',
};

const WUXING_LABELS: Record<string, string> = {
  Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水',
};

const WUXING_ORDER: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

// ─── 子组件：命盘 ─────────────────────────────────────────────────────────────

interface TianGanNode { pos: string; stem: string; wuxing: string; yinyang: string; }
interface CangGanNode { branchPos: string; qi: string; wuxing: string; }
interface Pillar { stem: string; branch: string; shishenStem?: string; }

interface BaziChartProps {
  pillars: { year?: Pillar; month?: Pillar; day?: Pillar; hour?: Pillar; };
  tianGanNodes: TianGanNode[];
  cangGanNodes: CangGanNode[];
  dayStem: string;
}

const UNKNOWN_PILLAR: Pillar = { stem: '?', branch: '?' };

function BaziChartCard({ pillars, tianGanNodes, cangGanNodes }: BaziChartProps) {
  const t = useTranslations('dashboard.bazi');

  const stemWuxingByPos = new Map(tianGanNodes.map(n => [n.pos, n.wuxing]));
  const branchWuxingByPos = new Map(
    cangGanNodes.filter(n => n.qi === 'BenQi').map(n => [n.branchPos, n.wuxing])
  );

  // SVG viewBox: 500×200 (5:2)
  // 四列各占 125px 宽，列中心 x: 62.5, 187.5, 312.5, 437.5
  const VW = 500;
  const VH = 200;
  const COL_W = VW / 4;                              // 125
  const LABEL_Y   = 22;                              // 年/月/日/时 标签
  const DIV_Y     = VH / 2;                          // 100，分隔线正中
  const BOX_TOP   = LABEL_Y + 12;                    // 34，天干区上边界
  const BOX_BOTTOM = DIV_Y - 6;                      // 94，天干区下边界
  const UPPER_MID = (BOX_TOP + BOX_BOTTOM) / 2;     // 64，天干垂直中心
  const LOWER_MID = (DIV_Y + 6 + VH - 8) / 2;       // 149，地支垂直中心
  const BOX_H     = BOX_BOTTOM - BOX_TOP;            // 60
  const BOX_W     = COL_W - 16;
  const BOX_R     = 10;

  const columns = [
    { key: 'year',  label: t('year'),  pillar: pillars.year  ?? UNKNOWN_PILLAR, stemPos: 'YearStem',  branchPos: 'YearBranch'  },
    { key: 'month', label: t('month'), pillar: pillars.month ?? UNKNOWN_PILLAR, stemPos: 'MonthStem', branchPos: 'MonthBranch' },
    { key: 'day',   label: t('day'),   pillar: pillars.day   ?? UNKNOWN_PILLAR, stemPos: 'DayStem',   branchPos: 'DayBranch'   },
    { key: 'hour',  label: t('hour'),  pillar: pillars.hour  ?? UNKNOWN_PILLAR, stemPos: 'HourStem',  branchPos: 'HourBranch'  },
  ];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      {columns.map(({ key, pillar, stemPos, branchPos }, idx) => {
        const cx = COL_W * idx + COL_W / 2;
        const stemWuxing   = stemWuxingByPos.get(stemPos)    || 'gray';
        const branchWuxing = branchWuxingByPos.get(branchPos) || 'gray';
        const stemColor    = ELEMENT_COLORS[stemWuxing]   ?? ELEMENT_COLORS['gray'];
        const branchColor  = ELEMENT_COLORS[branchWuxing] ?? ELEMENT_COLORS['gray'];
        const isDay = key === 'day';
        const isUnknown = !pillar.stem || pillar.stem === '?' || pillar.stem === 'Unknown';

        // 列背景（日主列高亮）
        const colX = COL_W * idx + 4;
        const colW = COL_W - 8;

        return (
          <g key={key}>
            {/* 列背景 */}
            <rect
              x={colX} y={4} width={colW} height={VH - 8}
              rx={14}
              fill={isDay ? 'hsl(var(--foreground) / 0.06)' : 'none'}
              stroke={isDay ? 'hsl(var(--foreground) / 0.15)' : 'hsl(var(--border))'}
              strokeWidth="1"
            />

            {/* 年/月/日/时 标签 */}
            <text
              x={cx} y={LABEL_Y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="11" letterSpacing="3"
              fill="hsl(var(--muted-foreground))"
              opacity="0.7"
            >
              {columns[idx].label}
            </text>

            {isUnknown ? (
              <>
                <text x={cx} y={BOX_TOP + BOX_H / 2} textAnchor="middle" dominantBaseline="middle"
                  fontSize="40" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
                <line x1={cx - 20} y1={DIV_Y} x2={cx + 20} y2={DIV_Y}
                  stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
                <text x={cx} y={LOWER_MID} textAnchor="middle" dominantBaseline="middle"
                  fontSize="40" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
              </>
            ) : (
              <>
                {/* 天干 */}
                {isDay ? (
                  <>
                    {/* 日主：彩色圆角方框 */}
                    <rect
                      x={cx - BOX_W / 2} y={BOX_TOP}
                      width={BOX_W} height={BOX_H} rx={BOX_R}
                      fill={`${stemColor}18`}
                      stroke={stemColor} strokeWidth="1.5"
                    />
                    <text
                      x={cx} y={BOX_TOP + BOX_H / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="46"
                      fill={stemColor}
                      style={{ filter: `drop-shadow(0 0 8px ${stemColor}66)` }}
                    >
                      {pillar.stem}
                    </text>
                  </>
                ) : (
                  <text
                    x={cx} y={BOX_TOP + BOX_H / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="46"
                    fill={stemColor}
                    style={{ filter: `drop-shadow(0 0 8px ${stemColor}66)` }}
                  >
                    {pillar.stem}
                  </text>
                )}

                {/* 分隔线 */}
                <line
                  x1={cx - 22} y1={DIV_Y} x2={cx + 22} y2={DIV_Y}
                  stroke="hsl(var(--border))" strokeWidth="1" opacity="0.6"
                />

                {/* 地支 */}
                <text
                  x={cx} y={LOWER_MID}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="46"
                  fill={branchColor}
                  style={{ filter: `drop-shadow(0 0 8px ${branchColor}66)` }}
                >
                  {pillar.branch}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── 十神→五行映射 ───────────────────────────────────────────────────────────

// 五行相生顺序：Wood→Fire→Earth→Metal→Water→Wood
const WUXING_SHENG: Record<string, Wuxing> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood',
};
// 五行相克顺序：Wood→Earth→Water→Fire→Metal→Wood
const WUXING_KE: Record<string, Wuxing> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood',
};
// 克我的五行
const WUXING_KE_ME: Record<string, Wuxing> = {
  Wood: 'Metal', Fire: 'Water', Earth: 'Wood', Metal: 'Fire', Water: 'Earth',
};
// 生我的五行
const WUXING_SHENG_ME: Record<string, Wuxing> = {
  Wood: 'Water', Fire: 'Wood', Earth: 'Fire', Metal: 'Earth', Water: 'Metal',
};

const SHISHEN_LABELS: Record<string, string> = {
  BiJian: '比肩', JieCai: '劫财',
  ShiShen: '食神', ShangGuan: '伤官',
  PianCai: '偏财', ZhengCai: '正财',
  QiSha: '七杀', ZhengGuan: '正官',
  PianYin: '偏印', ZhengYin: '正印',
};

function getShishenWuxing(shishen: string, dayMasterElement: Wuxing): Wuxing {
  switch (shishen) {
    case 'BiJian': case 'JieCai':   return dayMasterElement;
    case 'ShiShen': case 'ShangGuan': return WUXING_SHENG[dayMasterElement] ?? dayMasterElement;
    case 'PianCai': case 'ZhengCai':  return WUXING_KE[dayMasterElement]   ?? dayMasterElement;
    case 'QiSha': case 'ZhengGuan':   return WUXING_KE_ME[dayMasterElement] ?? dayMasterElement;
    case 'PianYin': case 'ZhengYin':  return WUXING_SHENG_ME[dayMasterElement] ?? dayMasterElement;
    default: return dayMasterElement;
  }
}

// ─── 子组件：五行能量雷达图（正面） ───────────────────────────────────────────

function RadarFace({ energyData, dayMasterElement }: {
  energyData: Record<Wuxing, number>;
  dayMasterElement: Wuxing;
}) {
  const maxVal = Math.max(...WUXING_ORDER.map(k => energyData[k] ?? 0), 1);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;

  // 以日主五行为起点，顺时针按木火土金水顺序排列
  const dayIdx = WUXING_ORDER.indexOf(dayMasterElement);
  const orderedWuxing = WUXING_ORDER.slice(dayIdx).concat(WUXING_ORDER.slice(0, dayIdx));

  const points = orderedWuxing.map((key, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const ratio = Math.min((energyData[key] ?? 0) / maxVal, 1);
    const r = maxR * 0.15 + maxR * 0.85 * ratio;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), key, angle };
  });

  const bgPoints = orderedWuxing.map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) };
  });

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';

  const accentColor = ELEMENT_COLORS[dayMasterElement] ?? ELEMENT_COLORS['Water'];

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        {[0.33, 0.66, 1].map(scale => (
          <path key={scale}
            d={toPath(bgPoints.map(p => ({ x: cx + (p.x - cx) * scale, y: cy + (p.y - cy) * scale })))}
            fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
        ))}
        {bgPoints.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
        ))}
        <path d={toPath(points)} fill={accentColor} fillOpacity="0.15"
          stroke={accentColor} strokeWidth="1.5" strokeOpacity="0.7" />
        {points.map(p => (
          <circle key={p.key} cx={p.x} cy={p.y} r="3"
            fill={ELEMENT_COLORS[p.key] ?? accentColor} opacity="0.9" />
        ))}
        {points.map(p => {
          const labelR = maxR + 18;
          const lx = cx + labelR * Math.cos(p.angle);
          const ly = cy + labelR * Math.sin(p.angle);
          return (
            <text key={p.key} x={lx} y={ly}
              textAnchor="middle" dominantBaseline="middle" fontSize="12"
              fill={ELEMENT_COLORS[p.key] ?? 'hsl(var(--muted-foreground))'} opacity="0.85">
              {WUXING_LABELS[p.key]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── 子组件：十神强度背面 ─────────────────────────────────────────────────────

// 全部10个十神固定顺序
const ALL_SHISHEN = [
  'BiJian','JieCai','ShiShen','ShangGuan',
  'PianCai','ZhengCai','QiSha','ZhengGuan',
  'PianYin','ZhengYin',
];

function ShishenFace({ shishenInfluence, dayMasterElement, dayMasterEnergy }: {
  shishenInfluence: { shishen: string; totalInfluence: number }[];
  dayMasterElement: Wuxing;
  dayMasterEnergy: number;
}) {
  const influenceMap = new Map(shishenInfluence.map(s => [s.shishen, s.totalInfluence]));
  // 最大值纳入日主能量
  const maxVal = Math.max(...shishenInfluence.map(s => s.totalInfluence), dayMasterEnergy, 1);

  const sorted = ALL_SHISHEN
    .map(shishen => ({ shishen, totalInfluence: influenceMap.get(shishen) ?? 0 }))
    .sort((a, b) => b.totalInfluence - a.totalInfluence);

  // SVG viewBox: 200×220 (11行，比10行略高)
  const VW = 200;
  const VH = 220;
  const PAD_X = 14;
  const PAD_Y = 10;
  const TOTAL_ROWS = 11; // 日主 + 10十神
  const ROW_H = (VH - PAD_Y * 2) / TOTAL_ROWS;
  const LABEL_W = 36;
  const BAR_X = PAD_X + LABEL_W + 6;
  const BAR_W = VW - BAR_X - PAD_X;
  const BAR_H = 4;
  const BAR_R = 2;

  // 日主行 + 十神行合并成一个渲染列表
  const allRows: { key: string; label: string; color: string; pct: number; isDay: boolean }[] = [
    // 日主固定第一行
    {
      key: 'DayMaster',
      label: '日主',
      color: ELEMENT_COLORS[dayMasterElement] ?? ELEMENT_COLORS['gray'],
      pct: dayMasterEnergy / maxVal,
      isDay: true,
    },
    // 十神按强度排序
    ...sorted.map(({ shishen, totalInfluence }) => ({
      key: shishen,
      label: SHISHEN_LABELS[shishen] ?? shishen,
      color: ELEMENT_COLORS[getShishenWuxing(shishen, dayMasterElement)] ?? ELEMENT_COLORS['gray'],
      pct: totalInfluence / maxVal,
      isDay: false,
    })),
  ];

  return (
    <div className="w-full h-full">
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {allRows.map(({ key, label, color, pct, isDay }, i) => {
          const cy = PAD_Y + ROW_H * i + ROW_H / 2;
          return (
            <g key={key}>
              <text
                x={PAD_X + LABEL_W} y={cy}
                textAnchor="end" dominantBaseline="middle"
                fontSize="11" fontWeight={isDay ? '400' : '300'}
                fill={isDay ? color : 'hsl(var(--muted-foreground))'}
              >
                {label}
              </text>
              <rect
                x={BAR_X} y={cy - BAR_H / 2}
                width={BAR_W} height={BAR_H} rx={BAR_R}
                fill="hsl(var(--border))"
              />
              {pct > 0 && (
                <rect
                  x={BAR_X} y={cy - BAR_H / 2}
                  width={BAR_W * pct} height={BAR_H} rx={BAR_R}
                  fill={color} opacity={isDay ? 1 : 0.85}
                >
                  <animate
                    attributeName="width"
                    from="0"
                    to={BAR_W * pct}
                    dur="0.5s"
                    fill="freeze"
                    calcMode="spline"
                    keySplines="0.4 0 0.2 1"
                    keyTimes="0;1"
                  />
                </rect>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── 子组件：可翻转五行卡片 ───────────────────────────────────────────────────

function FlippableEnergyCard({ energyData, dayMasterElement, shishenInfluence, dayMasterEnergy }: {
  energyData: Record<Wuxing, number>;
  dayMasterElement: Wuxing;
  shishenInfluence: { shishen: string; totalInfluence: number }[];
  dayMasterEnergy: number;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="w-full h-full cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
      >
        {/* 正面：雷达图 */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}>
          <RadarFace energyData={energyData} dayMasterElement={dayMasterElement} />
        </div>

        {/* 背面：十神强度 */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}>
          <ShishenFace shishenInfluence={shishenInfluence} dayMasterElement={dayMasterElement} dayMasterEnergy={dayMasterEnergy} />
        </div>
      </motion.div>
    </div>
  );
}

// ─── 子组件：付费按钮 ─────────────────────────────────────────────────────────

function ReadingButton({ profileId, hasReading }: { profileId: string; hasReading: boolean }) {
  const t = useTranslations('payment');
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_type: 'bazi', profile_id: profileId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (hasReading) {
    return (
      <button
        className="text-xs px-4 py-2 rounded-xl font-light"
        style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
      >
        {t('readingUnlocked')}
      </button>
    );
  }

  return (
    <button
      onClick={handleBuy}
      disabled={loading}
      className="text-xs px-3 py-2.5 rounded-xl font-light transition-all disabled:opacity-50 text-center"
      style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))', cursor: 'pointer' }}
    >
      {loading ? t('loading') : t('buyReading')}
    </button>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

export default function BaziPage() {
  const t = useTranslations();
  const router = useRouter();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasReading, setHasReading] = useState(false);

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

  useEffect(() => {
    if (!currentProfile) return;
    setLoading(true);
    setData(null);
    setError('');

    Promise.all([
      fetch(`/api/dashboard?profile_id=${currentProfile.id}`).then(r => r.json()),
      fetch(`/api/assessments/status?profile_id=${currentProfile.id}`).then(r => r.json()),
    ])
      .then(([dashData, statusData]) => {
        if (dashData.error) { setError(dashData.error); return; }
        setData(dashData);
        const baziStatus = (statusData.status || []).find((s: any) => s.id === 'bazi');
        setHasReading(baziStatus?.hasAiReading ?? false);
      })
      .catch(() => setError('load failed'))
      .finally(() => setLoading(false));
  }, [currentProfile?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>{t('dashboard.loadError')}</p>
      </div>
    );
  }

  const { bazi } = data;
  const lifeTimeline = data.lifeTimeline as LifeTimelineData | null | undefined;
  const dayStem: string = bazi.dayStem ?? '';
  const energyScores = bazi.energyScores as Record<Wuxing, number>;
  const tianGanNodes: TianGanNode[] = bazi.pillars?.tianGanNodes ?? [];
  const cangGanNodes: CangGanNode[] = bazi.pillars?.cangGanNodes ?? [];
  const dayNode = tianGanNodes.find(n => n.pos === 'DayStem');
  const element = (dayNode?.wuxing as Wuxing) || 'Water';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">

      {/* ── Row 1: 命盘（全宽） ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl cursor-pointer"
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
        }}
        onClick={() => console.log('命盘详情')}
      >
        <BaziChartCard
          pillars={bazi.pillars}
          tianGanNodes={tianGanNodes}
          cangGanNodes={cangGanNodes}
          dayStem={dayStem}
        />
      </motion.div>

      {/* ── Row 2: 左列(五行能量+付费报告) | 右列(日主小人) ── */}
      {/* 左右等宽，右列 alignItems:stretch 撑满左列总高           */}
      {/* 五行能量 1:1，付费报告 9:7，合计高度 ≈ 日主小人 9:16     */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>

        {/* 左列 */}
        <div className="flex flex-col gap-4">

          {/* 五行能量：1:1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              aspectRatio: '1/1',
              padding: '12px',
            }}
          >
            <FlippableEnergyCard
              energyData={energyScores}
              dayMasterElement={element}
              shishenInfluence={bazi.influence?.shishenInfluence ?? []}
              dayMasterEnergy={bazi.influence?.dayMasterEnergy ?? 0}
            />
          </motion.div>

          {/* 付费报告：9:7 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-4 flex flex-col items-center justify-center gap-3"
            style={{
              aspectRatio: '9/7',
              ...(hasReading
                ? {
                    background: 'hsl(var(--card))',
                    border: '1px solid rgba(168,85,247,0.4)',
                    boxShadow: '0 0 24px rgba(168,85,247,0.08)',
                  }
                : {
                    background: 'hsl(var(--muted) / 0.2)',
                    border: '1px dashed hsl(var(--border))',
                  }),
            }}
          >
            {currentProfile && (
              <ReadingButton profileId={currentProfile.id} hasReading={hasReading} />
            )}
          </motion.div>
        </div>

        {/* 右列：日主小人，9:16，stretch撑满左列总高 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl cursor-pointer"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            aspectRatio: '9/16',
          }}
          onClick={() => console.log('日主详情')}
        />
      </div>

      {/* 每日运势：暂时隐藏，待算法完善后恢复 */}
      {/* <motion.div ... /> */}

      {/* K线图：暂时隐藏，待能量算法完善后恢复 */}
      {/* <LifeKlineCard lifeTimeline={lifeTimeline} dayMasterElement={element} /> */}

    </div>
  );
}