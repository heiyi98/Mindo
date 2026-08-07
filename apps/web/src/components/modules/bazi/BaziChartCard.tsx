'use client';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useGridContext } from '@/contexts/GridContext';
import { getWuxingColor } from '@/lib/wuxing-colors';
import { useDashboardData } from '@/hooks/queries/useDashboardData';

const QI_ORDER = ['BenQi', 'ZhongQi', 'YuQi'];
const POSITIONS = ['Year', 'Month', 'Day', 'Hour'] as const;
type Pos = (typeof POSITIONS)[number];

const LABEL_KEYS: Record<Pos, 'year' | 'month' | 'day' | 'hour'> = {
  Year: 'year', Month: 'month', Day: 'day', Hour: 'hour',
};

// 这些语言的词典里，天干地支/十神本来就用汉字直接显示，
// 默认状态下不需要额外转拼音——只有拉丁语系默认才显示拼音
const HANZI_LOCALES = ['zh', 'zh-Hant', 'ja', 'ko'];

// 双击判定的等待时间（毫秒）——单击先延迟执行，如果这段时间内又点了一次，
// 就当作双击处理，取消单击那次的动作
const CLICK_DELAY = 220;

export const COLS = 4;
export const ROWS = 2;
export const CARD_META = { id: 'bazi-chart', cols: COLS, rows: ROWS, module: 'bazi' };

// 单色单瓣阴阳鱼角标——阳=白色鱼身、大头朝上（0°）；阴=黑色鱼身、大头朝下（180°，
// 同一份路径整体旋转半圈即可自然翻转朝向，不用另画一套路径）。
// 单瓣形状取自 https://commons.wikimedia.org/wiki/File:Yin_yang.svg 的其中一瓣路径，
// 坐标改成以圆心为原点，直接用translate(cx,cy)定位，不再用foreignObject套一个
// 子svg——foreignObject配合drop-shadow滤镜在部分渲染引擎下会带出一个多余的
// 灰色背景框，这次改成原生SVG元素直接画在主svg坐标系里，避开这个坑。
function YinYangBadge({ cx, cy, yinyang, size = 14 }: { cx: number; cy: number; yinyang: string; size?: number }) {
  const isYang = yinyang !== 'Yin';
  const rotation = isYang ? 0 : 180;
  const bodyColor = isYang ? '#ffffff' : '#0a0a0a';
  const eyeColor = isYang ? '#0a0a0a' : '#ffffff';
  const scale = size / 100;
  return (
    <g
      transform={`translate(${cx} ${cy}) scale(${scale}) rotate(${rotation})`}
      style={{ filter: 'drop-shadow(0 0 2.5px rgba(128,128,128,0.85))' }}
    >
      <path
        d="M0 -49 A24.5 24.5 0 0 1 0 0 A24.5 24.5 0 0 0 0 49 A49 49 0 0 1 0 -49 Z"
        fill={bodyColor}
      />
      <circle cx="0" cy="-24.5" r="6" fill={eyeColor} />
    </g>
  );
}

export default function BaziChartCard({ profileId }: { profileId: string }) {
  const t = useTranslations('bazi');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'bazi' | 'shishen'>('bazi');       // 正反面：天干 ↔ 十神
  const [detail, setDetail] = useState<'default' | 'simple'>('default'); // 详细度：原名/拼音 ↔ 阴阳五行/翻译
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grid = useGridContext();
  const { data } = useDashboardData(profileId);
  const bazi = data?.bazi ?? null;

  const isHanziLocale = HANZI_LOCALES.includes(locale);

  // 单击：切换正反面（天干↔十神）；双击：展开/收起藏干
  // 用延迟计时器区分单击和双击，避免两个事件互相打架
  const handleCardClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      if (expanded) {
        setExpanded(false);
        grid?.collapseCard('bazi-chart');
      } else {
        setExpanded(true);
        grid?.expandCard('bazi-chart', 2);
      }
      return;
    }
    clickTimer.current = setTimeout(() => {
      setMode(m => m === 'bazi' ? 'shishen' : 'bazi');
      clickTimer.current = null;
    }, CLICK_DELAY);
  };

  if (!bazi) {
    return (
      <div className="rounded-2xl"
        style={{ width: '100%', height: '100%', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      />
    );
  }

  const pillarsData = bazi.pillars;
  const tianGanNodes: any[] = bazi.pillars?.tianGanNodes ?? [];
  const cangGanNodes: any[] = bazi.pillars?.cangGanNodes ?? [];
  const shishenMap: any[] = bazi.shishen?.shishenMap ?? [];
  const shishenById = new Map<string, string>(shishenMap.map((s: any) => [s.id, s.shishen]));

  // 天干/地支文字：detail=simple时显示阴阳五行（配角标），否则显示原名（拼音语言词典里本来就是拼音，汉字语言词典里本来就是汉字，不用额外判断）
  function ganZhiText(wuxing: string | undefined, stem: string | undefined, dictNs: 'tiangan' | 'dizhi'): { text: string; yinyang: string | null } {
    if (!stem) return { text: '?', yinyang: null };
    if (detail === 'simple') {
      return { text: wuxing ? t(`wuxing.${wuxing}`) : '?', yinyang: null };
    }
    return { text: t(`${dictNs}.${stem}`), yinyang: null };
  }

  // 十神文字：只处理正常的九个十神。日主不走这个函数——它在调用的地方直接用
  // t('daymaster')这个固定逻辑id（法语=Moi），不依赖字符串比对来特判，
  // 避免"外层已经知道是日主，内部还要再猜一次"这种重复判断。
  // default时——拼音语言显示原始拼音代号（键名本身就是拼音），汉字语言显示汉字；
  // simple时统一显示翻译后的词
  function shishenText(ss: string | undefined): string {
    if (!ss) return '?';
    if (detail === 'simple') return t(`shishen.${ss}`);
    return isHanziLocale ? t(`shishen.${ss}`) : ss;
  }

  // 文字比单个汉字长得多的情况（拼音代号、五行词、十神翻译词，最长能到10个
  // 字符），固定字号会互相压到邻栏——不逐词各自计算字号，而是先扫一遍当前
  // 要显示的全部文字，取其中最长的那一个，反推出一个缩放比例，这一屏所有
  // 格子统一用同一个比例，保证字号整齐划一。覆盖两种会出现长词的场景：
  // 十神模式（拼音/翻译词）、天干地支的简易模式（阴阳五行词）。
  function scaleRatioFor(maxLen: number): number {
    if (maxLen <= 4) return 1;
    if (maxLen <= 6) return 0.72;
    if (maxLen <= 9) return 0.56;
    return 0.46;
  }

  // 估算一段文字大概有多宽，用来给椭圆光晕、阴阳鱼角标动态定位——汉字/日韩文
  // 近似正方形（宽≈字号），拉丁字母平均宽度按字号的62%估算（比之前保守一点，
  // 覆盖大写字母/宽字母偏多的词，如"Terre"）
  function estimatedTextWidth(text: string, fontSize: number): number {
    const charWidth = isHanziLocale ? fontSize : fontSize * 0.62;
    return text.length * charWidth;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // viewBox依据卡片自身COLS/ROWS比例
  // 命盘4列2行，正方形格子，宽高比2:1
  // 正常：500×250（2:1）
  // 展开：500×500（1:1，因为变成4行）
  // 天干地支坐标固定在0~250，展开后完全不动
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const VW = 500;
  const VH_NORMAL = 250;   // 对应2:1（4列2行）
  const VH_EXPANDED = 500; // 对应1:1（4列4行）
  const VH = expanded ? VH_EXPANDED : VH_NORMAL;
  const COL_W = VW / 4;   // 125

  // 天干区：0~125（上半）
  const LABEL_Y = 14;   // 柱名小字
  const STEM_Y = 68;    // 天干居中

  // 地支区：125~250（下半）
  const BRANCH_Y = 188; // 地支居中

  // 天干地支之间短横线：y=125
  const SHORT_LINE_HALF = 18;

  // 日干框：天干区内 y=5~120
  const DAY_COL_IDX = 2;
  const dayBoxX = COL_W * DAY_COL_IDX + 4;
  const dayBoxW = COL_W - 8;
  const dayBoxY = 5;
  const dayBoxH = 115;

  // 藏干区：250~500，均分三行，每行83单位，藏干在行中点
  const CANG_ROW_H = 250 / 3;  // ≈83.3
  const cangY = (ci: number) => 250 + CANG_ROW_H * ci + CANG_ROW_H / 2;

  const columns = POSITIONS.map((pos) => {
    const stemNode = tianGanNodes.find((n: any) => n.pos === `${pos}Stem`);
    const pillarEntry = pillarsData?.[pos.toLowerCase() as 'year' | 'month' | 'day' | 'hour'];
    const branch: string | undefined = pillarEntry?.branch;
    const rawCangGans = cangGanNodes.filter((n: any) => n.branchPos === `${pos}Branch`);
    const sortedCangGans = [...rawCangGans].sort(
      (a: any, b: any) => QI_ORDER.indexOf(a.qi) - QI_ORDER.indexOf(b.qi),
    );
    const stemShishen = stemNode ? shishenById.get(stemNode.id) : undefined;
    const benQiCg = sortedCangGans.find((cg: any) => cg.qi === 'BenQi');
    return {
      pos, stemNode, branch, stemShishen,
      branchWuxing: (benQiCg?.wuxing as string) ?? 'gray',
      cangGans: sortedCangGans.map((cg: any) => ({ ...cg, shishen: shishenById.get(cg.id) })),
    };
  });

  // 先把这一屏会显示的全部文字都算出来，取最长的那一个决定统一缩放比例——
  // 不管当前是十神模式（拼音/翻译词）还是天干地支的简易模式（阴阳五行词），
  // 只要文字比短拼音/单字长，就统一按同一套规则缩小；默认模式下的短文字
  // （单字/短拼音）天然不会触发缩小，不需要额外判断跳过。
  const allDisplayTexts: string[] = [];
  for (const col of columns) {
    const isDay = col.pos === 'Day';
    if (mode === 'bazi') {
      allDisplayTexts.push(ganZhiText(col.stemNode?.wuxing, col.stemNode?.stem, 'tiangan').text);
      allDisplayTexts.push(ganZhiText(col.branchWuxing, col.branch, 'dizhi').text);
      if (expanded) {
        for (const cg of col.cangGans.slice(0, 3)) {
          allDisplayTexts.push(ganZhiText(cg.wuxing, cg.stem, 'tiangan').text);
        }
      }
    } else {
      allDisplayTexts.push(isDay ? t('daymaster') : shishenText(col.stemShishen));
      const branchBenQiForScale = col.cangGans.find((cg: any) => cg.qi === 'BenQi');
      allDisplayTexts.push(shishenText(branchBenQiForScale?.shishen));
      if (expanded) {
        for (const cg of col.cangGans.slice(0, 3)) {
          allDisplayTexts.push(shishenText(cg.shishen));
        }
      }
    }
  }
  const maxLen = Math.max(0, ...allDisplayTexts.map(s => s.length));
  const textScaleRatio = scaleRatioFor(maxLen);

  const dayStemNode = tianGanNodes.find((n: any) => n.pos === 'DayStem');
  const dayStemColor = getWuxingColor(dayStemNode?.wuxing);

  return (
    <div
      style={{
        width: '100%', height: '100%', position: 'relative',
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '16px',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onClick={handleCardClick}
    >
      {/* Toggle开关：控制详细度（原名/拼音 ↔ 阴阳五行/翻译） */}
      <button
        style={{
          position: 'absolute', top: 10, right: 10,
          zIndex: 10,
          background: 'hsl(var(--muted))',
          border: 'none', cursor: 'pointer',
          borderRadius: 999,
          width: 36, height: 20,
          display: 'flex', alignItems: 'center',
          padding: '2px',
        }}
        onClick={e => {
          e.stopPropagation();
          setDetail(d => d === 'default' ? 'simple' : 'default');
        }}
      >
        <motion.div
          animate={{ x: detail === 'default' ? 0 : 16 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 16, height: 16,
            borderRadius: '50%',
            background: 'hsl(var(--muted-foreground))',
            flexShrink: 0,
          }}
        />
      </button>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* 日干框：天干区内 */}
        <rect
          x={dayBoxX} y={dayBoxY}
          width={dayBoxW} height={dayBoxH}
          rx={10} fill="none"
          stroke={dayStemColor} strokeWidth="1.5" opacity="0.6"
        />

        {/* 四列分隔线：贯通整个viewBox */}
        {[1, 2, 3].map(i => (
          <line key={i}
            x1={COL_W * i} y1={4}
            x2={COL_W * i} y2={VH - 4}
            stroke="hsl(var(--border))" strokeWidth="1" opacity="0.4"
          />
        ))}

        {/* 地支藏干之间长横线（展开时） */}
        {expanded && (
          <line x1={0} y1={250} x2={VW} y2={250}
            stroke="hsl(var(--border))" strokeWidth="1" opacity="0.4" />
        )}

        {/* 四柱内容：坐标固定在0~250，展开不影响 */}
        {columns.map(({ pos, stemNode, branch, stemShishen, branchWuxing }, idx) => {
          const cx = COL_W * idx + COL_W / 2;
          const colRight = COL_W * (idx + 1);
          const stemWuxing: string = stemNode?.wuxing ?? 'gray';
          const stemColor = getWuxingColor(stemWuxing);
          const branchColor = getWuxingColor(branchWuxing);
          const isUnknown = !stemNode || !branch;
          const isDay = pos === 'Day';
          const stemDisplay = mode === 'bazi'
            ? ganZhiText(stemNode?.wuxing, stemNode?.stem, 'tiangan')
            : { text: isDay ? t('daymaster') : shishenText(stemShishen), yinyang: null };

          const branchBenQi = cangGanNodes.find((cg: any) => cg.branchPos === `${pos}Branch` && cg.qi === 'BenQi');
          const branchDisplay = mode === 'bazi'
            ? ganZhiText(branchWuxing, branch, 'dizhi')
            : { text: shishenText(branchBenQi ? shishenById.get(branchBenQi.id) : undefined), yinyang: null };

          const stemFontSize = 34 * textScaleRatio;
          const branchFontSize = 34 * textScaleRatio;

          const stemTextWidth = estimatedTextWidth(stemDisplay.text, stemFontSize);
          const branchTextWidth = estimatedTextWidth(branchDisplay.text, branchFontSize);

          // 阴阳鱼紧贴文字右上角：间隙缩到2px，同时用colRight硬性封顶，
          // 不管估算准不准，位置都不会越过这一栏的边界线
          const stemBadgeSize = 13;
          const branchBadgeSize = 13;
          const stemBadgeCx = Math.min(
            cx + stemTextWidth / 2 + 2 + stemBadgeSize / 2,
            colRight - stemBadgeSize / 2 - 2,
          );
          const branchBadgeCx = Math.min(
            cx + branchTextWidth / 2 + 2 + branchBadgeSize / 2,
            colRight - branchBadgeSize / 2 - 2,
          );

          return (
            <g key={pos}>
              <text x={cx} y={LABEL_Y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" letterSpacing="2"
                fill="hsl(var(--muted-foreground))" opacity="0.6"
              >{t(LABEL_KEYS[pos as Pos])}</text>

              {isUnknown ? (
                <text x={cx} y={STEM_Y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
              ) : (
                <g>
                  <text x={cx} y={STEM_Y}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={stemFontSize} fill={stemColor}
                  >{stemDisplay.text}</text>
                  {mode === 'bazi' && detail === 'simple' && stemNode?.yinyang && (
                    <YinYangBadge
                      cx={stemBadgeCx}
                      cy={STEM_Y - stemFontSize * 0.32}
                      yinyang={stemNode.yinyang} size={stemBadgeSize}
                    />
                  )}
                </g>
              )}

              {/* 天干地支短横线 y=125 */}
              <line
                x1={cx - SHORT_LINE_HALF} y1={125}
                x2={cx + SHORT_LINE_HALF} y2={125}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1" opacity="0.4"
              />

              {isUnknown ? (
                <text x={cx} y={BRANCH_Y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.2">?</text>
              ) : (
                <g>
                  <text x={cx} y={BRANCH_Y}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={branchFontSize} fill={branchColor}
                  >{branchDisplay.text}</text>
                  {mode === 'bazi' && detail === 'simple' && branchBenQi?.yinyang && (
                    <YinYangBadge
                      cx={branchBadgeCx}
                      cy={BRANCH_Y - branchFontSize * 0.32}
                      yinyang={branchBenQi.yinyang} size={branchBadgeSize}
                    />
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* 藏干区：250~500，上对齐 */}
        <AnimatePresence>
          {expanded && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {columns.map(({ pos, cangGans }, idx) => {
                const cx = COL_W * idx + COL_W / 2;
                const colRight = COL_W * (idx + 1);
                const displayed = cangGans.slice(0, 3);
                return (
                  <g key={`${pos}-cang`}>
                    {displayed.map((cg: any, ci: number) => {
                      const cgColor = getWuxingColor(cg.wuxing as string);
                      const display: string = mode === 'bazi'
                        ? ganZhiText(cg.wuxing, cg.stem, 'tiangan').text
                        : shishenText(cg.shishen);
                      const y = cangY(ci);
                      const cgFontSize = 20 * textScaleRatio;
                      const cgTextWidth = estimatedTextWidth(display, cgFontSize);
                      const cgBadgeSize = 9;
                      const cgBadgeCx = Math.min(
                        cx + cgTextWidth / 2 + 2 + cgBadgeSize / 2,
                        colRight - cgBadgeSize / 2 - 2,
                      );
                      return (
                        <g key={cg.id ?? ci}>
                          {ci > 0 && (
                            <line
                              x1={cx - SHORT_LINE_HALF} y1={250 + CANG_ROW_H * ci}
                              x2={cx + SHORT_LINE_HALF} y2={250 + CANG_ROW_H * ci}
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth="1" opacity="0.3"
                            />
                          )}
                          <text x={cx} y={y}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize={cgFontSize} fill={cgColor}
                          >{display}</text>
                          {mode === 'bazi' && detail === 'simple' && cg.yinyang && (
                            <YinYangBadge
                              cx={cgBadgeCx}
                              cy={y - cgFontSize * 0.32}
                              yinyang={cg.yinyang} size={cgBadgeSize}
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}