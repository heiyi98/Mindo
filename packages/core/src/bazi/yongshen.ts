import type { BaziSnapshot, Wuxing, ShiShen, WuxingAssessment, WuxingStrengthLabel } from './types';
import { GENERATES, RESTRAINS, TIANGAN_WUXING } from './constants';

const WUXING_LIST: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
type WxState = Record<Wuxing, number>;

// 链式反应：生克同时作用，用初始值计算 Δ，同步应用
function chainReact(s: WxState, t: number): WxState {
  const d: WxState = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const a of WUXING_LIST) {
    const b = GENERATES[a];
    const delta = (s[a] * s[b]) / t;
    d[a] -= delta; d[b] += delta;
  }
  for (const a of WUXING_LIST) {
    const b = RESTRAINS[a];
    const delta = (s[a] * s[b]) / t;
    d[a] -= delta; d[b] -= delta; // 互耗
  }
  const r: WxState = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const w of WUXING_LIST) r[w] = Math.max(0, s[w] + d[w]);
  return r;
}

function calcHKScore(
  energy: Record<Wuxing, number>,
  hGroup: Wuxing[],
  kGroup: Wuxing[]
): number {
  const H = hGroup.reduce((sum, w) => sum + (energy[w] ?? 0), 0);
  const K = kGroup.reduce((sum, w) => sum + (energy[w] ?? 0), 0);
  if (K === 0) return H;
  return Math.abs(H / K - 1);
}

export function computeWuxingAssessment(
  snapshot: Pick<BaziSnapshot, 'energyScores' | 'dayStem'>
): WuxingAssessment[] {
  const baseEnergy: WxState = { ...snapshot.energyScores } as WxState;
  const dayStemWuxing: Wuxing = TIANGAN_WUXING[snapshot.dayStem];

  // 反向查找：生我五行（印）和克我五行（官杀）
  const generatedByMap = {} as Record<Wuxing, Wuxing>;
  const restrainedByMap = {} as Record<Wuxing, Wuxing>;
  for (const w of WUXING_LIST) {
    generatedByMap[GENERATES[w]] = w;  // GENERATES[w] 被 w 所生
    restrainedByMap[RESTRAINS[w]] = w; // RESTRAINS[w] 被 w 所克
  }

  const hGroup: Wuxing[] = [dayStemWuxing, generatedByMap[dayStemWuxing]];
  const kGroup: Wuxing[] = [
    GENERATES[dayStemWuxing],          // 我生（食伤）
    RESTRAINS[dayStemWuxing],          // 我克（财）
    restrainedByMap[dayStemWuxing],    // 克我（官杀）
  ];

  // 五行→十神对映射
  const wuxingToShishen: Record<Wuxing, ShiShen[]> = {
    [dayStemWuxing]:                  ['BiJian', 'JieCai'],
    [GENERATES[dayStemWuxing]]:       ['ShiShen', 'ShangGuan'],
    [RESTRAINS[dayStemWuxing]]:       ['PianCai', 'ZhengCai'],
    [restrainedByMap[dayStemWuxing]]: ['QiSha', 'ZhengGuan'],
    [generatedByMap[dayStemWuxing]]:  ['PianYin', 'ZhengYin'],
  } as Record<Wuxing, ShiShen[]>;

  const T = WUXING_LIST.reduce((s, w) => s + baseEnergy[w], 0) || 1;
  const baseScore = calcHKScore(baseEnergy, hGroup, kGroup);

  const candidates: Array<{
    wuxing: Wuxing;
    effect: number;
    strengthened: ShiShen[];
    weakened: ShiShen[];
  }> = [];

  for (const candidate of WUXING_LIST) {
    const candidateEnergy: WxState = { ...baseEnergy };
    candidateEnergy[candidate] = candidateEnergy[candidate] + 30;
    const T_aug = T + 30;

    const afterEnergy = chainReact(candidateEnergy, T_aug);
    const candidateScore = calcHKScore(afterEnergy, hGroup, kGroup);

    const effect = baseScore === 0 ? 0 : (baseScore - candidateScore) / baseScore;
    if (Math.abs(effect) < 0.25) continue;

    const strengthened: ShiShen[] = [];
    const weakened: ShiShen[] = [];
    for (const w of WUXING_LIST) {
      const pair = wuxingToShishen[w];
      if (!pair) continue;
      if (afterEnergy[w] > baseEnergy[w]) strengthened.push(...pair);
      else if (afterEnergy[w] < baseEnergy[w]) weakened.push(...pair);
    }

    candidates.push({ wuxing: candidate, effect, strengthened, weakened });
  }

  candidates.sort((a, b) => b.effect - a.effect);
  if (candidates.length === 0) return [];

  const maxAbsEffect = Math.max(...candidates.map(c => Math.abs(c.effect)));

  return candidates.map(c => {
    let strengthLabel: WuxingStrengthLabel;
    if (c.effect > 0 && c.effect > maxAbsEffect * 0.50)       strengthLabel = '关键用神';
    else if (c.effect > 0)                                      strengthLabel = '辅助用神';
    else if (Math.abs(c.effect) > maxAbsEffect * 0.50)         strengthLabel = '强忌神';
    else                                                        strengthLabel = '弱忌神';

    return {
      wuxing: c.wuxing,
      role: (c.effect > 0 ? 'yongshen' : 'jishen') as WuxingAssessment['role'],
      strengthLabel,
      effect: c.effect,
      impacts: { strengthened: c.strengthened, weakened: c.weakened },
    };
  });
}
