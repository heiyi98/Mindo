import type { BaziSnapshot, GongWeiPos, ShiShen, Wuxing, YinYang, TianGan } from './types';
import { computeWuxingAssessment } from './yongshen';
import { TIANGAN_WUXING, TIANGAN_YINYANG, GENERATES, RESTRAINS } from './constants';

const SHISHEN_ZH: Record<string, string> = {
  BiJian: '比肩', JieCai: '劫财', ShiShen: '食神', ShangGuan: '伤官',
  PianCai: '偏财', ZhengCai: '正财', QiSha: '七杀', ZhengGuan: '正官',
  PianYin: '偏印', ZhengYin: '正印', DayMaster: '日主',
};
const WUXING_ZH: Record<string, string> = {
  Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水',
};
const YINYANG_ZH: Record<string, string> = {
  Yang: '阳', Yin: '阴',
};
const TIANGAN_ZH: Record<string, string> = {
  Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊',
  Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸',
};
const DIZHI_ZH: Record<string, string> = {
  Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳',
  Wu: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥',
};

const POSITION_LABEL: Record<GongWeiPos, string> = {
  YearStem: '年干', YearBranch: '年支',
  MonthStem: '月干', MonthBranch: '月支',
  DayStem: '日干', DayBranch: '日支',
  HourStem: '时干', HourBranch: '时支',
};

const TIAN_GAN_HE_ZH: Record<string, string> = {
  ZhenHua: '真化', HeBan: '合绊', ZhengHe: '争合', DuHe: '妒合',
};

const DIZHI_RELATION_ZH: Record<string, string> = {
  SanHui: '三会', SanHe: '三合', BanHe: '半合', GongHe: '拱合',
  LiuHe: '六合', LiuChong: '六冲', Xing: '刑', Hai: '害', Po: '破',
};

const WUXING_ORDER: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

const ALL_TEN_SHISHEN: Exclude<ShiShen, 'DayMaster'>[] = [
  'BiJian', 'JieCai', 'ShiShen', 'ShangGuan',
  'PianCai', 'ZhengCai', 'QiSha', 'ZhengGuan',
  'PianYin', 'ZhengYin',
];

type WuxingStrength = '极强' | '偏强' | '中' | '偏弱' | '极弱' | '缺失';

function wuxingStrength(value: number, total: number): WuxingStrength {
  if (total === 0 || value === 0) return '缺失';
  const ratio = value / total;
  if (ratio >= 0.5) return '极强';
  if (ratio >= 0.3) return '偏强';
  if (ratio >= 0.15) return '中';
  if (ratio >= 0.05) return '偏弱';
  return '极弱';
}

type StrengthLabel = '极强' | '强' | '中' | '弱' | '极弱' | '缺失';

function getStrengthLabel(value: number, mean: number): StrengthLabel {
  if (value === 0) return '缺失';
  if (value > mean * 2.00) return '极强';
  if (value > mean * 1.25) return '强';
  if (value > mean * 0.50) return '中';
  if (value > mean * 0.25) return '弱';
  return '极弱';
}

function buildShishenMeta(
  dayStem: TianGan
): Record<string, { wuxing: Wuxing; yinyang: YinYang }> {
  const dayWuxing = TIANGAN_WUXING[dayStem];
  const dayYinyang = TIANGAN_YINYANG[dayStem];
  const opposite: YinYang = dayYinyang === 'Yang' ? 'Yin' : 'Yang';
  const generates = GENERATES[dayWuxing];
  const restrains = RESTRAINS[dayWuxing];
  const restrainsDay = (Object.entries(RESTRAINS) as [Wuxing, Wuxing][])
    .find(([, v]) => v === dayWuxing)![0];
  const generatesDay = (Object.entries(GENERATES) as [Wuxing, Wuxing][])
    .find(([, v]) => v === dayWuxing)![0];
  return {
    BiJian:    { wuxing: dayWuxing,    yinyang: dayYinyang },
    JieCai:    { wuxing: dayWuxing,    yinyang: opposite },
    ShiShen:   { wuxing: generates,    yinyang: dayYinyang },
    ShangGuan: { wuxing: generates,    yinyang: opposite },
    PianCai:   { wuxing: restrains,    yinyang: dayYinyang },
    ZhengCai:  { wuxing: restrains,    yinyang: opposite },
    QiSha:     { wuxing: restrainsDay, yinyang: dayYinyang },
    ZhengGuan: { wuxing: restrainsDay, yinyang: opposite },
    PianYin:   { wuxing: generatesDay, yinyang: dayYinyang },
    ZhengYin:  { wuxing: generatesDay, yinyang: opposite },
  };
}

// ── 导出：按十神中文名生成元数据行 ──────────────────────────────────────────
export function buildShishenMetadata(snapshot: BaziSnapshot): Record<string, string[]> {
  const shishenById = new Map(snapshot.shishen.shishenMap.map(n => [n.id, n.shishen]));
  const visibilityById = new Map(snapshot.tougen.cangGanVisibility.map(v => [v.cangganId, v]));
  const tougenByStemPos = new Map(snapshot.tougen.touGenResults.map(r => [r.stemPos, r]));

  const nodesByShishen = new Map<ShiShen, typeof snapshot.energy.energyNodes>();
  for (const node of snapshot.energy.energyNodes) {
    const ss = shishenById.get(node.id);
    if (!ss || ss === 'DayMaster') continue;
    if (!nodesByShishen.has(ss)) nodesByShishen.set(ss, []);
    nodesByShishen.get(ss)!.push(node);
  }

  const result: Record<string, string[]> = {};

  for (const ssKey of ALL_TEN_SHISHEN) {
    const ssZH = SHISHEN_ZH[ssKey] ?? ssKey;
    const nodes = nodesByShishen.get(ssKey) ?? [];

    if (nodes.length === 0) {
      result[ssZH] = ['（无节点）'];
      continue;
    }

    const lines: string[] = [];
    for (const node of nodes) {
      if (node.type === 'TianGan') {
        const tougen = tougenByStemPos.get(node.pos);
        const roots = tougen?.roots.map(r => POSITION_LABEL[r.branchPos]) ?? [];
        const posLabel = POSITION_LABEL[node.pos];
        if (roots.length > 0) {
          lines.push(`${posLabel}：通根→${roots.join(' ')}`);
        } else {
          lines.push(`${posLabel}：（无通根）`);
        }
      } else {
        const posLabel = POSITION_LABEL[node.pos];
        if (node.disableReason === 'MuKuLocked') {
          lines.push(`${posLabel}：墓库锁闭`);
        } else if (visibilityById.get(node.id)?.tag === 'TouChu') {
          const tianGanNode = snapshot.pillars.tianGanNodes.find(tg => tg.wuxing === node.wuxing);
          const throughLabel = tianGanNode ? POSITION_LABEL[tianGanNode.pos] : '（未知）';
          lines.push(`${posLabel}：透出→${throughLabel}`);
        } else {
          lines.push(`${posLabel}：（未透出）`);
        }
      }
    }
    result[ssZH] = lines;
  }

  return result;
}

export function preparePhase1Input(snapshot: BaziSnapshot): string {
  const lines: string[] = [];

  // ── 段1：日主 ──
  const dayStemZH = TIANGAN_ZH[snapshot.dayStem] ?? snapshot.dayStem;
  const dayWuxingZH = WUXING_ZH[TIANGAN_WUXING[snapshot.dayStem]] ?? '';
  const dayYinyangZH = YINYANG_ZH[TIANGAN_YINYANG[snapshot.dayStem]] ?? '';
  lines.push(`日主：${dayStemZH}（${dayYinyangZH}${dayWuxingZH}）`);
  lines.push('');

  // ── 段2：五行强弱 ──
  const scores = snapshot.energyScores;
  const totalScore = WUXING_ORDER.reduce((s, wx) => s + (scores[wx] ?? 0), 0);
  const wxParts = WUXING_ORDER.map(wx =>
    `${WUXING_ZH[wx]}${wuxingStrength(scores[wx] ?? 0, totalScore)}`
  );
  lines.push(`五行强弱：${wxParts.join(' ')}`);
  lines.push('');

  // ── 段3：十神 ──
  lines.push('十神：');

  const shishenMeta = buildShishenMeta(snapshot.dayStem);

  const activeInfluences = [...snapshot.influence.shishenInfluence]
    .sort((a, b) => b.totalInfluence - a.totalInfluence);
  const activeSet = new Set(activeInfluences.map(g => g.shishen));

  const ssActive = activeInfluences.filter(g => g.totalInfluence > 0);
  const ssMean = ssActive.length > 0
    ? ssActive.reduce((s, g) => s + g.totalInfluence, 0) / ssActive.length
    : 0;

  const allEntries: { shishen: ShiShen; totalInfluence: number }[] = [
    ...activeInfluences.map(g => ({ shishen: g.shishen, totalInfluence: g.totalInfluence })),
    ...ALL_TEN_SHISHEN
      .filter(ss => !activeSet.has(ss))
      .map(ss => ({ shishen: ss as ShiShen, totalInfluence: 0 })),
  ];

  const shishenById = new Map(snapshot.shishen.shishenMap.map(n => [n.id, n.shishen]));
  const visibilityById = new Map(snapshot.tougen.cangGanVisibility.map(v => [v.cangganId, v]));
  const tougenByStemPos = new Map(snapshot.tougen.touGenResults.map(r => [r.stemPos, r]));

  const nodesByShishen = new Map<ShiShen, typeof snapshot.energy.energyNodes>();
  for (const node of snapshot.energy.energyNodes) {
    const ss = shishenById.get(node.id);
    if (!ss || ss === 'DayMaster') continue;
    if (!nodesByShishen.has(ss)) nodesByShishen.set(ss, []);
    nodesByShishen.get(ss)!.push(node);
  }

  for (const { shishen: ssKey, totalInfluence } of allEntries) {
    const meta = shishenMeta[ssKey];
    if (!meta) continue;

    const ssZH = SHISHEN_ZH[ssKey] ?? ssKey;
    lines.push(`${ssZH} ${YINYANG_ZH[meta.yinyang]}${WUXING_ZH[meta.wuxing]} ${getStrengthLabel(totalInfluence, ssMean)}`);

    const nodes = nodesByShishen.get(ssKey) ?? [];
    if (nodes.length === 0) {
      lines.push('  （无节点）');
    } else {
      for (const node of nodes) {
        if (node.type === 'TianGan') {
          const tougen = tougenByStemPos.get(node.pos);
          const roots = tougen?.roots.map(r => POSITION_LABEL[r.branchPos]) ?? [];
          const posLabel = POSITION_LABEL[node.pos];
          if (roots.length > 0) {
            lines.push(`  ${posLabel}：通根→${roots.join(' ')}`);
          } else {
            lines.push(`  ${posLabel}：（无通根）`);
          }
        } else {
          const posLabel = POSITION_LABEL[node.pos];
          if (node.disableReason === 'MuKuLocked') {
            lines.push(`  ${posLabel}：墓库锁闭`);
          } else if (visibilityById.get(node.id)?.tag === 'TouChu') {
            const tianGanNode = snapshot.pillars.tianGanNodes.find(tg => tg.wuxing === node.wuxing);
            const throughLabel = tianGanNode ? POSITION_LABEL[tianGanNode.pos] : '（未知）';
            lines.push(`  ${posLabel}：透出→${throughLabel}`);
          } else {
            lines.push(`  ${posLabel}：（未透出）`);
          }
        }
      }
    }
    lines.push('');
  }

  // ── 段4：干支关系 ──
  lines.push('干支关系：');

  for (const he of snapshot.relations.tianGanHe) {
    if (he.result === 'ZhenHua') {
      const side1 = `${POSITION_LABEL[he.stem1Pos]}${TIANGAN_ZH[he.stem1] ?? he.stem1}${WUXING_ZH[TIANGAN_WUXING[he.stem1]] ?? ''}`;
      const side2 = `${POSITION_LABEL[he.stem2Pos]}${TIANGAN_ZH[he.stem2] ?? he.stem2}${WUXING_ZH[TIANGAN_WUXING[he.stem2]] ?? ''}`;
      lines.push(`${side1} × ${side2} 合化${WUXING_ZH[he.huashen] ?? he.huashen}`);
    } else {
      const id1 = `${he.stem1Pos}_${he.stem1}`;
      const id2 = `${he.stem2Pos}_${he.stem2}`;
      const ss1 = shishenById.get(id1);
      const ss2 = shishenById.get(id2);
      lines.push([
        `${ss1 ? SHISHEN_ZH[ss1] : '?'}${YINYANG_ZH[TIANGAN_YINYANG[he.stem1]]}${WUXING_ZH[TIANGAN_WUXING[he.stem1]]}${POSITION_LABEL[he.stem1Pos]}`,
        `${ss2 ? SHISHEN_ZH[ss2] : '?'}${YINYANG_ZH[TIANGAN_YINYANG[he.stem2]]}${WUXING_ZH[TIANGAN_WUXING[he.stem2]]}${POSITION_LABEL[he.stem2Pos]}`,
      ].join(' × ') + ' ' + (TIAN_GAN_HE_ZH[he.result] ?? he.result));
    }
  }

  for (const chong of snapshot.relations.tianGanChong) {
    const id1 = `${chong.stem1Pos}_${chong.stem1}`;
    const id2 = `${chong.stem2Pos}_${chong.stem2}`;
    const ss1 = shishenById.get(id1);
    const ss2 = shishenById.get(id2);
    lines.push([
      `${ss1 ? SHISHEN_ZH[ss1] : '?'}${YINYANG_ZH[TIANGAN_YINYANG[chong.stem1]]}${WUXING_ZH[TIANGAN_WUXING[chong.stem1]]}${POSITION_LABEL[chong.stem1Pos]}`,
      `${ss2 ? SHISHEN_ZH[ss2] : '?'}${YINYANG_ZH[TIANGAN_YINYANG[chong.stem2]]}${WUXING_ZH[TIANGAN_WUXING[chong.stem2]]}${POSITION_LABEL[chong.stem2Pos]}`,
    ].join(' × ') + ' 天干冲');
  }

  const benQiMap = new Map<GongWeiPos, ShiShen | undefined>();
  for (const pos of ['YearBranch', 'MonthBranch', 'DayBranch', 'HourBranch'] as GongWeiPos[]) {
    const cgsAtPos = snapshot.pillars.cangGanNodes.filter(cg => cg.branchPos === pos);
    if (cgsAtPos.length === 0) continue;
    const benQi = cgsAtPos.reduce((best, cg) => cg.baseScore > best.baseScore ? cg : best);
    benQiMap.set(pos, shishenById.get(benQi.id) as ShiShen | undefined);
  }

  for (const rel of snapshot.relations.diZhiRelations) {
    const parts = rel.positions.map(pos => {
      const ss = benQiMap.get(pos);
      const ssZH = ss ? SHISHEN_ZH[ss] : '?';
      const meta = ss ? shishenMeta[ss] : undefined;
      const yyZH = meta ? YINYANG_ZH[meta.yinyang] : '';
      const wxZH = meta ? WUXING_ZH[meta.wuxing] : '';
      return `${POSITION_LABEL[pos]}${ssZH}${yyZH}${wxZH}`;
    });
    const huifangSuffix = (rel.type === 'SanHui' || rel.type === 'SanHe') && rel.wuxing
      ? ` 会方${WUXING_ZH[rel.wuxing]}`
      : '';
    lines.push(`${parts.join(' × ')} ${DIZHI_RELATION_ZH[rel.type] ?? rel.type}${huifangSuffix}`);
  }

  lines.push('');

  // ── 段5：用神忌神 ──
  for (const a of computeWuxingAssessment(snapshot)) {
    const roleZH = a.role === 'yongshen' ? '用神' : '忌神';
    lines.push(`${WUXING_ZH[a.wuxing] ?? a.wuxing}：${roleZH}（${a.strengthLabel}）`);
  }
  lines.push('');

  return lines.join('\n');
}