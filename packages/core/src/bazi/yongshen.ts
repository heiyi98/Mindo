import type { BaziSnapshot, Wuxing, ShiShen, WuxingAssessment, WuxingStrengthLabel } from './types';
import { GENERATES, RESTRAINS, TIANGAN_WUXING } from './constants';

const WUXING_LIST: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

type SSGroups = { A: number; B: number; C: number; D: number; E: number };

// A=印星, B=比劫(含日主), C=食伤, D=财星, E=官杀
const GROUP_SHISHEN: Record<keyof SSGroups, ShiShen[]> = {
  A: ['PianYin', 'ZhengYin'],
  B: ['BiJian', 'JieCai'],
  C: ['ShiShen', 'ShangGuan'],
  D: ['PianCai', 'ZhengCai'],
  E: ['QiSha', 'ZhengGuan'],
};

const GROUP_LOOKUP = new Map<ShiShen, keyof SSGroups>();
for (const [key, list] of Object.entries(GROUP_SHISHEN) as Array<[keyof SSGroups, ShiShen[]]>) {
  for (const ss of list) GROUP_LOOKUP.set(ss, key);
}

// ── 链式反应 ──────────────────────────────────────────────────────────────────
// 相生循环 A(印)→B(比劫)→C(食伤)→D(财)→E(官杀)→A，能量每步递减0.2
// 自身+1 | 子（我生）+0.8 | 母（生我）-0.2 | 被克者-0.6（隔1位克）| 克我者-0.3（反侮消耗）
const CYCLE: Array<keyof SSGroups> = ['A', 'B', 'C', 'D', 'E'];
const COEFF_SELF     =  1.0;
const COEFF_CHILD    =  0.8;
const COEFF_TARGET   = -0.6;
const COEFF_PREDATOR = -0.3;
const COEFF_PARENT   = -0.2;

// ── 分级阈值（均相对于 baseScore）────────────────────────────────────────────
const THRESHOLD_XIANSHEN = 0.10; // |effect| < baseScore×10% → 闲神（无命理依据，设计决策）
const THRESHOLD_STRONG   = 0.50; // |effect| ≥ baseScore×50% → 强用神 / 强忌神

function computeCandidateEffect(
  groups: SSGroups,
  changedKey: keyof SSGroups,
  immuneGroups: Set<keyof SSGroups> = new Set(),
): SSGroups {
  const AMOUNT = 30;
  const idx = CYCLE.indexOf(changedKey);

  const childKey    = CYCLE[(idx + 1) % 5];
  const parentKey   = CYCLE[(idx + 4) % 5];
  const targetKey   = CYCLE[(idx + 2) % 5];
  const predatorKey = CYCLE[(idx + 3) % 5];

  const d: SSGroups = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  d[changedKey]  += AMOUNT * COEFF_SELF;
  d[childKey]    += AMOUNT * COEFF_CHILD;
  d[parentKey]   += AMOUNT * COEFF_PARENT;
  d[predatorKey] += AMOUNT * COEFF_PREDATOR;

  if (!immuneGroups.has(targetKey)) {
    d[targetKey] += AMOUNT * COEFF_TARGET;
  }

  return {
    A: Math.max(0, groups.A + d.A),
    B: Math.max(0, groups.B + d.B),
    C: Math.max(0, groups.C + d.C),
    D: Math.max(0, groups.D + d.D),
    E: Math.max(0, groups.E + d.E),
  };
}

// ── 特殊格局 ──────────────────────────────────────────────────────────────────

type GroupLabelMap = Record<keyof SSGroups, WuxingStrengthLabel>;

const ZHUANWANG_LABELS: GroupLabelMap = {
  B: '关键用神', C: '强用神', A: '弱用神', E: '强忌神', D: '弱忌神',
};

const CONG_LABELS: Record<string, GroupLabelMap> = {
  '从儿格': { C: '关键用神', D: '强用神', A: '强忌神', E: '弱忌神', B: '弱忌神' },
  '从财格': { D: '关键用神', C: '强用神', B: '强忌神', A: '弱忌神', E: '弱忌神' },
  '从杀格': { E: '关键用神', D: '强用神', C: '强忌神', B: '弱忌神', A: '弱忌神' },
  '从强格': { A: '关键用神', B: '强用神', D: '强忌神', C: '弱忌神', E: '弱忌神' },
};

const LABEL_EFFECT: Record<WuxingStrengthLabel, number> = {
  '关键用神':  1.0,
  '强用神':    0.6,
  '弱用神':    0.3,
  '闲神':      0.0,
  '弱忌神':   -0.3,
  '强忌神':   -0.6,
};

function getGroupWuxingMap(dmWx: Wuxing): Record<keyof SSGroups, Wuxing> {
  let generatedBy = dmWx;
  let restrainedBy = dmWx;
  for (const w of WUXING_LIST) {
    if (GENERATES[w] === dmWx) generatedBy = w;
    if (RESTRAINS[w] === dmWx) restrainedBy = w;
  }
  return { B: dmWx, A: generatedBy, C: GENERATES[dmWx], D: RESTRAINS[dmWx], E: restrainedBy };
}

function buildSpecialAssessment(
  groupWuxing: Record<keyof SSGroups, Wuxing>,
  labels: GroupLabelMap,
): WuxingAssessment[] {
  const result: WuxingAssessment[] = [];
  for (const key of ['A', 'B', 'C', 'D', 'E'] as Array<keyof SSGroups>) {
    const strengthLabel = labels[key];
    const effect = LABEL_EFFECT[strengthLabel];
    result.push({
      wuxing: groupWuxing[key],
      role: effect > 0 ? 'yongshen' : effect < 0 ? 'jishen' : 'xianshen',
      strengthLabel,
      effect,
      impacts: { strengthened: [], weakened: [] },
    });
  }
  result.sort((a, b) => b.effect - a.effect);
  return result;
}

function getSpecialPatternAssessment(
  snapshot: Pick<BaziSnapshot, 'dayStem' | 'pattern' | 'relations'>,
): WuxingAssessment[] {
  const pattern = snapshot.pattern;
  if (!pattern) return [];

  if (pattern.category === 'zhuanwang') {
    return buildSpecialAssessment(getGroupWuxingMap(TIANGAN_WUXING[snapshot.dayStem]), ZHUANWANG_LABELS);
  }

  if (pattern.category === 'cong') {
    const labels = CONG_LABELS[pattern.name];
    return labels ? buildSpecialAssessment(getGroupWuxingMap(TIANGAN_WUXING[snapshot.dayStem]), labels) : [];
  }

  if (pattern.category === 'huaqi') {
    const zhenhua = snapshot.relations.tianGanHe.find(r =>
      r.result === 'ZhenHua' && (r.stem1Pos === 'DayStem' || r.stem2Pos === 'DayStem'),
    );
    return zhenhua
      ? buildSpecialAssessment(getGroupWuxingMap(zhenhua.huashen), ZHUANWANG_LABELS)
      : [];
  }

  return [];
}

// ── 主函数 ────────────────────────────────────────────────────────────────────

export function computeWuxingAssessment(
  snapshot: Pick<BaziSnapshot, 'energy' | 'shishen' | 'dayStem' | 'pattern' | 'relations'>,
): WuxingAssessment[] {
  if (snapshot.pattern && snapshot.pattern.category !== 'normal') {
    return getSpecialPatternAssessment(snapshot);
  }

  const { energyNodes } = snapshot.energy;
  const { shishenMap } = snapshot.shishen;

  const shishenById = new Map<string, ShiShen>();
  for (const n of shishenMap) shishenById.set(n.id, n.shishen);

  const groups_base: SSGroups = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  for (const node of energyNodes) {
    if (!node.outputEnabled) continue;
    const ss = shishenById.get(node.id);
    if (!ss) continue;
    const gk = ss === 'DayMaster' ? 'B' : GROUP_LOOKUP.get(ss);
    if (gk) groups_base[gk] += node.energy;
  }

  const H_base = groups_base.A + groups_base.B;
  const K_base = groups_base.C + groups_base.D + groups_base.E;
  const baseScore = Math.abs(H_base - K_base);

  if (baseScore === 0) return [];

  const dayStemWuxing = TIANGAN_WUXING[snapshot.dayStem];
  const generatedByMap = {} as Record<Wuxing, Wuxing>;
  const restrainedByMap = {} as Record<Wuxing, Wuxing>;
  for (const w of WUXING_LIST) {
    generatedByMap[GENERATES[w]] = w;
    restrainedByMap[RESTRAINS[w]] = w;
  }
  const wuxingToGroup: Record<Wuxing, keyof SSGroups> = {
    [dayStemWuxing]:                  'B',
    [generatedByMap[dayStemWuxing]]:  'A',
    [GENERATES[dayStemWuxing]]:       'C',
    [RESTRAINS[dayStemWuxing]]:       'D',
    [restrainedByMap[dayStemWuxing]]: 'E',
  } as Record<Wuxing, keyof SSGroups>;

  const sanhuiImmune = new Set<Wuxing>(
    snapshot.relations.diZhiRelations
      .filter(r => r.type === 'SanHui' && r.wuxing)
      .map(r => r.wuxing!),
  );
  const immuneGroups = new Set<keyof SSGroups>();
  for (const wx of sanhuiImmune) {
    const gk = wuxingToGroup[wx];
    if (gk) immuneGroups.add(gk);
  }

  // 计算各候选五行的效值
  type Candidate = {
    wuxing: Wuxing;
    effect: number;          // baseScore - newImbalance，正=改善，负=恶化
    strengthened: ShiShen[];
    weakened: ShiShen[];
  };

  const candidates: Candidate[] = WUXING_LIST.map(candidate => {
    const groupKey = wuxingToGroup[candidate];
    const after = computeCandidateEffect(groups_base, groupKey, immuneGroups);

    const H_new = after.A + after.B;
    const K_new = after.C + after.D + after.E;
    const newImbalance = Math.abs(H_new - K_new);

    const strengthened: ShiShen[] = [];
    const weakened: ShiShen[] = [];
    for (const key of ['A', 'B', 'C', 'D', 'E'] as Array<keyof SSGroups>) {
      if (after[key] > groups_base[key])      strengthened.push(...GROUP_SHISHEN[key]);
      else if (after[key] < groups_base[key]) weakened.push(...GROUP_SHISHEN[key]);
    }

    return { wuxing: candidate, effect: baseScore - newImbalance, strengthened, weakened };
  });

  // 按效值降序排列（最强用神在前，最强忌神在后）
  candidates.sort((a, b) => b.effect - a.effect);

  const result: WuxingAssessment[] = [];
  let keyAssigned = false;

  for (const c of candidates) {
    const absEffect = Math.abs(c.effect);

    if (absEffect < baseScore * THRESHOLD_XIANSHEN) {
      // 闲神：影响极小，无喜忌（阈值无命理依据，设计决策N=10%）
      result.push({
        wuxing: c.wuxing,
        role: 'xianshen',
        strengthLabel: '闲神',
        effect: c.effect,
        impacts: { strengthened: c.strengthened, weakened: c.weakened },
      });
    } else if (c.effect > 0) {
      // 用神
      let strengthLabel: WuxingStrengthLabel;
      if (!keyAssigned) {
        strengthLabel = '关键用神';
        keyAssigned = true;
      } else if (absEffect >= baseScore * THRESHOLD_STRONG) {
        strengthLabel = '强用神';
      } else {
        strengthLabel = '弱用神';
      }
      result.push({
        wuxing: c.wuxing,
        role: 'yongshen',
        strengthLabel,
        effect: c.effect,
        impacts: { strengthened: c.strengthened, weakened: c.weakened },
      });
    } else {
      // 忌神
      const strengthLabel: WuxingStrengthLabel =
        absEffect >= baseScore * THRESHOLD_STRONG ? '强忌神' : '弱忌神';
      result.push({
        wuxing: c.wuxing,
        role: 'jishen',
        strengthLabel,
        effect: c.effect,
        impacts: { strengthened: c.strengthened, weakened: c.weakened },
      });
    }
  }

  return result;
}