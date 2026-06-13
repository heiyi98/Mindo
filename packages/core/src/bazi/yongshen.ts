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

// 生：A→B→C→D→E→A；克：B克D、C克E、D克A、E克B、A克C
function computeCandidateEffect(
  groups: SSGroups,
  changedKey: keyof SSGroups,
  immuneGroups: Set<keyof SSGroups> = new Set(),
): SSGroups {
  const ng: SSGroups = { ...groups, [changedKey]: groups[changedKey] + 30 };

  const d = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  const GEN: Array<[keyof SSGroups, keyof SSGroups]> = [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'],
  ];
  const KE: Array<[keyof SSGroups, keyof SSGroups]> = [
    ['B', 'D'], ['C', 'E'], ['D', 'A'], ['E', 'B'], ['A', 'C'],
  ];

  for (const [a, b] of GEN) {
    if (a !== changedKey && b !== changedKey) continue;
    const sum = ng[a] + ng[b];
    // 基础互动量 AB/(A+B)：势均力敌时等动，强方优势，来自势均力敌为相冲的传统定义
    const base = sum > 0 ? (ng[a] * ng[b]) / sum : 0;
    d[a] -= base;
    d[b] += base * (5 / 3); // 受生方获得 base×5/3（月令系数近旺1.25÷泄气0.75）
  }
  for (const [a, b] of KE) {
    if (a !== changedKey && b !== changedKey) continue;
    if (immuneGroups.has(b)) continue; // 三会局五行，旺神不可克
    const sum = ng[a] + ng[b];
    if (sum === 0) continue;
    // 克方耗损 AB²/(A+B)²×1；受克方损失 A²B/(A+B)²×2（月令系数受制0.50÷失令0.25）
    d[a] -= (ng[a] * ng[b] * ng[b]) / (sum * sum);
    d[b] -= (ng[a] * ng[a] * ng[b]) / (sum * sum) * 2;
  }

  return {
    A: Math.max(0, ng.A + d.A),
    B: Math.max(0, ng.B + d.B),
    C: Math.max(0, ng.C + d.C),
    D: Math.max(0, ng.D + d.D),
    E: Math.max(0, ng.E + d.E),
  };
}

// ── 特殊格局（化气/专旺/从格）用神忌神判定：跳过五行平衡算法，直接按格局规则取标签 ──

type GroupLabelMap = Record<keyof SSGroups, WuxingStrengthLabel>;

// 专旺格统一规则：比劫=关键用神 食伤=强用神 印星=弱用神 官杀=强忌神 财星=弱忌神
// 化气格以化神为新日主重新推算五组后，套用同一套标签
const ZHUANWANG_LABELS: GroupLabelMap = {
  B: '关键用神', C: '强用神', A: '弱用神', E: '强忌神', D: '弱忌神',
};

const CONG_LABELS: Record<string, GroupLabelMap> = {
  '从儿格': { C: '关键用神', D: '强用神', A: '强忌神', E: '弱忌神', B: '弱忌神' },
  '从财格': { D: '关键用神', C: '强用神', B: '强忌神', A: '弱忌神', E: '弱忌神' },
  '从杀格': { E: '关键用神', D: '强用神', C: '强忌神', B: '弱忌神', A: '弱忌神' },
  '从强格': { A: '关键用神', B: '强用神', D: '强忌神', C: '弱忌神', E: '弱忌神' },
};

// 强弱标签→effect 数值（特殊格局不跑平衡算法，强弱直接映射为固定值 1.0/0.6/0.3）
const LABEL_EFFECT: Record<WuxingStrengthLabel, number> = {
  '关键用神': 1.0, '强用神': 0.6, '弱用神': 0.3,
  '强忌神': -0.6, '弱忌神': -0.3,
};

// 以 dmWx 为日主，推算五组对应的五行：B=同我 A=生我 C=我生 D=我克 E=克我
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
  labels: GroupLabelMap
): WuxingAssessment[] {
  const result: WuxingAssessment[] = [];
  for (const key of ['A', 'B', 'C', 'D', 'E'] as Array<keyof SSGroups>) {
    const strengthLabel = labels[key];
    const effect = LABEL_EFFECT[strengthLabel];
    result.push({
      wuxing: groupWuxing[key],
      role: effect > 0 ? 'yongshen' : 'jishen',
      strengthLabel,
      effect,
      impacts: { strengthened: [], weakened: [] },
    });
  }
  result.sort((a, b) => b.effect - a.effect);
  return result;
}

function getSpecialPatternAssessment(
  snapshot: Pick<BaziSnapshot, 'dayStem' | 'pattern' | 'relations'>
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
    // 化神五行取自真化记录的 huashen 字段（与 pattern.ts 判定化气格用同一条件），以化神为新日主套用专旺格规则
    const zhenhua = snapshot.relations.tianGanHe.find(r =>
      r.result === 'ZhenHua' && (r.stem1Pos === 'DayStem' || r.stem2Pos === 'DayStem')
    );
    return zhenhua ? buildSpecialAssessment(getGroupWuxingMap(zhenhua.huashen), ZHUANWANG_LABELS) : [];
  }

  return [];
}

// 全量链式反应（备用，当前未调用）
function shishenChainReact(g: SSGroups): SSGroups {
  const d = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  const GEN: Array<[keyof SSGroups, keyof SSGroups]> = [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'],
  ];
  for (const [a, b] of GEN) {
    const sum = g[a] + g[b];
    const base = sum > 0 ? (g[a] * g[b]) / sum : 0;
    d[a] -= base;
    d[b] += base * (5 / 3);
  }

  const KE: Array<[keyof SSGroups, keyof SSGroups]> = [
    ['B', 'D'], ['C', 'E'], ['D', 'A'], ['E', 'B'], ['A', 'C'],
  ];
  for (const [a, b] of KE) {
    const sum = g[a] + g[b];
    if (sum === 0) continue;
    d[a] -= (g[a] * g[b] * g[b]) / (sum * sum);
    d[b] -= (g[a] * g[a] * g[b]) / (sum * sum) * 2;
  }

  return {
    A: Math.max(0, g.A + d.A),
    B: Math.max(0, g.B + d.B),
    C: Math.max(0, g.C + d.C),
    D: Math.max(0, g.D + d.D),
    E: Math.max(0, g.E + d.E),
  };
}

export function computeWuxingAssessment(
  snapshot: Pick<BaziSnapshot, 'energy' | 'shishen' | 'dayStem' | 'pattern' | 'relations'>
): WuxingAssessment[] {
  // 特殊格局（化气/专旺/从格）不参与五行平衡博弈，直接按格局规则给出用神忌神
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
    // 日主并入比劫组（B）
    const gk = ss === 'DayMaster' ? 'B' : GROUP_LOOKUP.get(ss);
    if (gk) groups_base[gk] += node.energy;
  }

  const H_base = groups_base.A + groups_base.B; // 扶我方：印星+比劫(含日主)
  const K_base = groups_base.C + groups_base.D + groups_base.E; // 耗我方：食伤+财+官杀
  // 扶我方减耗我方的绝对值
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
    [dayStemWuxing]:                  'B', // 同我→比劫
    [generatedByMap[dayStemWuxing]]:  'A', // 生我→印星
    [GENERATES[dayStemWuxing]]:       'C', // 我生→食伤
    [RESTRAINS[dayStemWuxing]]:       'D', // 我克→财星
    [restrainedByMap[dayStemWuxing]]: 'E', // 克我→官杀
  } as Record<Wuxing, keyof SSGroups>;

  // 三会局五行免疫克链式反应
  // 依据：旺神不可克——三会局气势最盛，克之反受其伤
  const sanhuiImmune = new Set<Wuxing>(
    snapshot.relations.diZhiRelations
      .filter(r => r.type === 'SanHui' && r.wuxing)
      .map(r => r.wuxing!)
  );
  const immuneGroups = new Set<keyof SSGroups>();
  for (const wx of sanhuiImmune) {
    const gk = wuxingToGroup[wx];
    if (gk) immuneGroups.add(gk);
  }

  type CandidateRaw = {
    wuxing: Wuxing;
    newImbalance: number;
    strengthened: ShiShen[];
    weakened: ShiShen[];
  };
  const raw: CandidateRaw[] = [];

  for (const candidate of WUXING_LIST) {
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

    raw.push({ wuxing: candidate, newImbalance, strengthened, weakened });
  }

  const yongshenRaw = raw.filter(c => c.newImbalance < baseScore);
  const jishenRaw   = raw.filter(c => c.newImbalance >= baseScore);

  const minNewImbalance = yongshenRaw.length > 0
    ? Math.min(...yongshenRaw.map(c => c.newImbalance)) : 0;
  const keyOptimization = baseScore - minNewImbalance;

  const maxNewImbalance = jishenRaw.length > 0
    ? Math.max(...jishenRaw.map(c => c.newImbalance)) : baseScore;
  const maxDeterioration = maxNewImbalance - baseScore;

  const result: WuxingAssessment[] = [];
  let keyAssigned = false;

  for (const c of yongshenRaw) {
    const optimization = baseScore - c.newImbalance;
    let strengthLabel: WuxingStrengthLabel;
    if (!keyAssigned && c.newImbalance === minNewImbalance) {
      strengthLabel = '关键用神'; keyAssigned = true;
    } else if (optimization >= keyOptimization * 0.5) { // 强弱分界50%，设计决策，无古籍依据
      strengthLabel = '强用神';
    } else {
      strengthLabel = '弱用神';
    }
    result.push({
      wuxing: c.wuxing,
      role: 'yongshen',
      strengthLabel,
      effect: optimization,
      impacts: { strengthened: c.strengthened, weakened: c.weakened },
    });
  }

  for (const c of jishenRaw) {
    const deterioration = c.newImbalance - baseScore;
    const strengthLabel: WuxingStrengthLabel =
      maxDeterioration > 0 && deterioration >= maxDeterioration * 0.5 // 强弱分界50%，设计决策，无古籍依据
        ? '强忌神' : '弱忌神';
    result.push({
      wuxing: c.wuxing,
      role: 'jishen',
      strengthLabel,
      effect: -deterioration,
      impacts: { strengthened: c.strengthened, weakened: c.weakened },
    });
  }

  result.sort((a, b) => b.effect - a.effect);
  return result;
}
