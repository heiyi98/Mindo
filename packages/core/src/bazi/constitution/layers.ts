// ═══════════════════════════════════════════════════════════════════════════
// 四层计算——常规版/子平版共用同一套函数，只是输入的节点/免疫集合来源不同
// （常规版走 regularEnergy.ts 现算、恒无三会免疫；子平版走 ziPingEnergy.ts
// 从既有 BaziSnapshot 转换、三会免疫从 relations.diZhiRelations 收集）。
// ═══════════════════════════════════════════════════════════════════════════
import type { Wuxing } from '../types';
import { GENERATES, RESTRAINS } from '../constants';
import { yinyangStrengthLabel, averageStrengthLabel, averageOfPositive, stdev, fiveConstitutionLabel } from './strength';
import { ORGAN_MAP } from './organMapping';
import type {
  ConstitutionEnergyNode,
  ConstitutionLayerOne,
  ConstitutionLayerTwo,
  ConstitutionLayerThree,
  ConstitutionLayerFour,
  YinYangGroupResult,
  YinYangWuxingStaticResult,
} from './types';

const WUXING_LIST: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
const YINYANG_LIST: Array<'Yang' | 'Yin'> = ['Yang', 'Yin'];

// 反向映射：谁生成了X（层三"被生者/母"用）、谁克制X（层三"克己者"用）
const GENERATED_BY = {} as Record<Wuxing, Wuxing>;
for (const w of WUXING_LIST) GENERATED_BY[GENERATES[w]] = w;

const RESTRAINED_BY = {} as Record<Wuxing, Wuxing>;
for (const w of WUXING_LIST) RESTRAINED_BY[RESTRAINS[w]] = w;

const ZERO_FIVE = (): Record<Wuxing, number> => ({ Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 });

// ── 层一：阴阳层 ──────────────────────────────────────────────────────────

function computeYinYangGroup(nodes: ConstitutionEnergyNode[]): YinYangGroupResult {
  const yangSum = nodes.filter(n => n.yinyang === 'Yang').reduce((sum, n) => sum + n.energy, 0);
  const yinSum = nodes.filter(n => n.yinyang === 'Yin').reduce((sum, n) => sum + n.energy, 0);
  const { yang, yin } = yinyangStrengthLabel(yangSum, yinSum);
  return { yangSum, yinSum, yangLabel: yang, yinLabel: yin };
}

export function computeLayerOne(nodes: ConstitutionEnergyNode[]): ConstitutionLayerOne {
  const overall = computeYinYangGroup(nodes);
  return {
    overall,
    tianGan: computeYinYangGroup(nodes.filter(n => n.type === 'TianGan')),
    cangGan: computeYinYangGroup(nodes.filter(n => n.type === 'CangGan')),
    fiveConstitution: fiveConstitutionLabel(overall),
  };
}

// ── 层二：静态阴阳五行层 ───────────────────────────────────────────────────

export function computeLayerTwo(nodes: ConstitutionEnergyNode[]): ConstitutionLayerTwo {
  const fiveValues = ZERO_FIVE();
  for (const n of nodes) fiveValues[n.wuxing] += n.energy;

  const fiveAvg = averageOfPositive(WUXING_LIST.map(w => fiveValues[w]));
  const fiveResults = WUXING_LIST.map(w => ({
    wuxing: w,
    value: fiveValues[w],
    label: averageStrengthLabel(fiveValues[w], fiveAvg),
  }));

  const tenValues = new Map<string, number>();
  for (const yy of YINYANG_LIST) for (const w of WUXING_LIST) tenValues.set(`${yy}_${w}`, 0);
  for (const n of nodes) {
    const key = `${n.yinyang}_${n.wuxing}`;
    tenValues.set(key, (tenValues.get(key) ?? 0) + n.energy);
  }
  const tenAvg = averageOfPositive([...tenValues.values()]);

  const tenResults: YinYangWuxingStaticResult[] = [];
  for (const yy of YINYANG_LIST) {
    for (const w of WUXING_LIST) {
      const value = tenValues.get(`${yy}_${w}`) ?? 0;
      tenResults.push({
        yinyang: yy,
        wuxing: w,
        value,
        label: averageStrengthLabel(value, tenAvg),
        organ: ORGAN_MAP[yy][w],
      });
    }
  }

  return { fiveValues, fiveResults, tenResults };
}

// ── computeDeltas()：固定系数线性叠加模型 ──────────────────────────────────
// 只服务 computeLayerFour()（固定30点注入探针 + stdev比较），原封不动，
// 层三已经改用下面的 computeSigmoidDeltas()，两个函数互不调用、互不影响。
function computeDeltas(
  base: Record<Wuxing, number>,
  immuneWuxing: Set<Wuxing>
): Record<Wuxing, number> {
  const deltas = ZERO_FIVE();

  for (const source of WUXING_LIST) {
    const v = base[source];
    if (v === 0) continue;

    const child = GENERATES[source];      // 生者（子）
    const parent = GENERATED_BY[source];  // 被生者（母）
    const target = RESTRAINS[source];     // 所克者
    const predator = RESTRAINED_BY[source]; // 克己者

    deltas[source] += v * 1.0;
    deltas[child] += v * 0.8;
    deltas[parent] += v * -0.2;
    if (!immuneWuxing.has(target)) {
      deltas[target] += v * -0.6;
    }
    deltas[predator] += v * -0.3;
  }

  return deltas;
}

// ── computeSigmoidDeltas()：对数饱和函数（Logistic Sigmoid）模型 ───────────
// 只服务 computeLayerThree()，跟上面的 computeDeltas() 完全独立、互不调用。
//
// 每个五行节点 T 同时接收来自其余四个关系角色的贡献（角色相对 T 本身，
// 不是相对日主）：
//   母（生我者，GENERATED_BY[T]）→ T 增长，系数 0.8
//   子（我生/泄我者，GENERATES[T]）→ T 衰减，系数 0.2
//   官（克我/我耗者，RESTRAINED_BY[T]）→ T 衰减，系数 0.6
//   财（我克者，RESTRAINS[T]）→ T 衰减，系数 0.3
//
// 每条关系：比值=对方能量/T能量，t=ln(比值)，饱和系数=1/(1+e^(-t))
//（恒属于(0,1)区间，满足 f(比值)+f(1/比值)=1 的对称性）；
// 该关系对T的调整量 = T原值 × 饱和系数 × 关系系数。
// T新值 = T原值 + 母增长量 − 子衰减量 − 官衰减量 − 财衰减量，不做clamp
//（非负性由公式结构本身保证，见函数下方的边界情况说明）。
function sigmoidSaturation(ratio: number): number {
  const t = Math.log(ratio);
  return 1 / (1 + Math.exp(-t));
}

function computeSigmoidDeltas(
  base: Record<Wuxing, number>,
  immuneWuxing: Set<Wuxing>
): Record<Wuxing, number> {
  const result = ZERO_FIVE();

  for (const target of WUXING_LIST) {
    const t0 = base[target];
    if (t0 === 0) {
      result[target] = 0;
      continue;
    }

    const motherWx = GENERATED_BY[target];   // 母：生我者
    const childWx = GENERATES[target];       // 子：我生/泄我者
    const officerWx = RESTRAINED_BY[target]; // 官：克我/我耗者
    const wealthWx = RESTRAINS[target];      // 财：我克者

    const growFromMother = t0 * sigmoidSaturation(base[motherWx] / t0) * 0.8;
    const decayFromChild = t0 * sigmoidSaturation(base[childWx] / t0) * 0.2;
    const decayFromOfficer = immuneWuxing.has(target)
      ? 0
      : t0 * sigmoidSaturation(base[officerWx] / t0) * 0.6;
    const decayFromWealth = t0 * sigmoidSaturation(base[wealthWx] / t0) * 0.3;

    result[target] = t0 + growFromMother - decayFromChild - decayFromOfficer - decayFromWealth;
  }

  return result;
}

export function computeLayerThree(
  fiveValues: Record<Wuxing, number>,
  immuneWuxing: Set<Wuxing> = new Set()
): ConstitutionLayerThree {
  return computeSigmoidDeltas(fiveValues, immuneWuxing);
}

// ── 层四：处方层 ───────────────────────────────────────────────────────────
// 在层三结果基础上，对每一行做固定注入30点能量的反事实测试
// （复用用神算法 bazi/energy/yongshen.ts 同款注入量），比较标准差升降判定宜补/宜泻

const INJECT_AMOUNT = 30;

export function computeLayerFour(
  baseline: ConstitutionLayerThree,
  immuneWuxing: Set<Wuxing> = new Set()
): ConstitutionLayerFour {
  const stdBefore = stdev(WUXING_LIST.map(w => baseline[w]));

  return WUXING_LIST.map(candidate => {
    const injected = ZERO_FIVE();
    injected[candidate] = INJECT_AMOUNT;
    const delta = computeDeltas(injected, immuneWuxing);

    const after = ZERO_FIVE();
    for (const w of WUXING_LIST) after[w] = Math.max(0, baseline[w] + delta[w]);

    const stdAfter = stdev(WUXING_LIST.map(w => after[w]));

    const advice = stdAfter < stdBefore ? 'supplement' : stdAfter > stdBefore ? 'reduce' : 'neutral';

    return { wuxing: candidate, advice, stdBefore, stdAfter } as const;
  });
}
