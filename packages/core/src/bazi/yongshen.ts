import type { BaziSnapshot, Wuxing, ShiShen, WuxingAssessment, WuxingStrengthLabel } from './types';
import { GENERATES, RESTRAINS, TIANGAN_WUXING } from './constants';

const WUXING_LIST: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

type SSGroups = { A: number; B: number; C: number; D: number; E: number };

// A=印星, B=比劫, C=食伤, D=财星, E=官杀
const GROUP_SHISHEN: Record<keyof SSGroups, ShiShen[]> = {
  A: ['PianYin', 'ZhengYin'],
  B: ['BiJian', 'JieCai'],
  C: ['ShiShen', 'ShangGuan'],
  D: ['PianCai', 'ZhengCai'],
  E: ['QiSha', 'ZhengGuan'],
};

// 生：A→B→C→D→E→A；克：B克D、C克E、D克A、E克B、A克C
function shishenChainReact(g: SSGroups): SSGroups {
  const T = g.A + g.B + g.C + g.D + g.E;
  if (T === 0) return { ...g };

  const d = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  const GEN: Array<[keyof SSGroups, keyof SSGroups]> = [
    ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'],
  ];
  for (const [a, b] of GEN) {
    const delta = (g[a] * g[b]) / T;
    d[a] -= delta; d[b] += delta;
  }

  const KE: Array<[keyof SSGroups, keyof SSGroups]> = [
    ['B', 'D'], ['C', 'E'], ['D', 'A'], ['E', 'B'], ['A', 'C'],
  ];
  for (const [a, b] of KE) {
    const delta = (g[a] * g[b]) / T;
    d[a] -= delta; d[b] -= delta;
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
  snapshot: Pick<BaziSnapshot, 'influence' | 'dayStem'>
): WuxingAssessment[] {
  const { shishenInfluence, dayMasterEnergy } = snapshot.influence;

  const ssMap = new Map<ShiShen, number>();
  for (const g of shishenInfluence) ssMap.set(g.shishen, g.totalInfluence);
  const get = (ss: ShiShen) => ssMap.get(ss) ?? 0;

  const groups_base: SSGroups = {
    A: get('PianYin') + get('ZhengYin'),
    B: get('BiJian') + get('JieCai'),
    C: get('ShiShen') + get('ShangGuan'),
    D: get('PianCai') + get('ZhengCai'),
    E: get('QiSha') + get('ZhengGuan'),
  };

  const groups_after = shishenChainReact(groups_base);
  const H_base = groups_after.A + groups_after.B + dayMasterEnergy;
  const K_base = groups_after.C + groups_after.D + groups_after.E;
  const baseScore = K_base === 0 ? H_base : Math.abs(H_base / K_base - 1);

  if (baseScore === 0) return [];

  // 候选五行 → 十神组映射
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

  const candidates: Array<{
    wuxing: Wuxing;
    effect: number;
    strengthened: ShiShen[];
    weakened: ShiShen[];
  }> = [];

  for (const candidate of WUXING_LIST) {
    const groupKey = wuxingToGroup[candidate];
    const candidate_groups: SSGroups = { ...groups_base, [groupKey]: groups_base[groupKey] + 30 };
    const after = shishenChainReact(candidate_groups);

    const H_new = after.A + after.B + dayMasterEnergy;
    const K_new = after.C + after.D + after.E;
    const candidateScore = K_new === 0 ? H_new : Math.abs(H_new / K_new - 1);

    const effect = (baseScore - candidateScore) / baseScore;
    if (Math.abs(effect) < baseScore * 0.25) continue;

    const strengthened: ShiShen[] = [];
    const weakened: ShiShen[] = [];
    for (const key of ['A', 'B', 'C', 'D', 'E'] as Array<keyof SSGroups>) {
      if (after[key] > groups_base[key])      strengthened.push(...GROUP_SHISHEN[key]);
      else if (after[key] < groups_base[key]) weakened.push(...GROUP_SHISHEN[key]);
    }

    candidates.push({ wuxing: candidate, effect, strengthened, weakened });
  }

  candidates.sort((a, b) => b.effect - a.effect);
  if (candidates.length === 0) return [];

  const maxAbsEffect = Math.max(...candidates.map(c => Math.abs(c.effect)));

  return candidates.map(c => {
    let strengthLabel: WuxingStrengthLabel;
    if (c.effect > 0 && c.effect > maxAbsEffect * 0.50)   strengthLabel = '关键用神';
    else if (c.effect > 0)                                  strengthLabel = '辅助用神';
    else if (Math.abs(c.effect) > maxAbsEffect * 0.50)     strengthLabel = '强忌神';
    else                                                    strengthLabel = '弱忌神';

    return {
      wuxing: c.wuxing,
      role: (c.effect > 0 ? 'yongshen' : 'jishen') as WuxingAssessment['role'],
      strengthLabel,
      effect: c.effect,
      impacts: { strengthened: c.strengthened, weakened: c.weakened },
    };
  });
}
