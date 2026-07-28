import type { SimilarityFactor, WuxingVector, BigFiveVector } from './types';
import { wuxingSimilarity } from './factors/wuxing';
import { bigFiveSimilarity } from './factors/bigfive';

const FACTOR_REGISTRY: SimilarityFactor[] = [
  { type: 'wuxing', compute: (a, b) => wuxingSimilarity(a as WuxingVector, b as WuxingVector) },
  { type: 'bigfive', compute: (a, b) => bigFiveSimilarity(a as BigFiveVector, b as BigFiveVector) },
  // 未来新增十神/紫微等因子：往这个数组里加一项，不改下面的合并逻辑
];

/**
 * metricsA/metricsB: metric_type -> metric_data，来自 mind_card_metrics 按 card_id 分组后的结果
 * （或浏览者本人的实时计算结果，用同一个 Map<string, unknown> 形状表示）。
 * 权重按"双方都存在数据的因子数量"平分；任一因子单侧缺失就跳过，不参与计算也不拉低总分。
 * 一个因子都没激活时返回 0（不是 null），调用方直接参与总分公式，无需特判。
 */
export function combinePersonalitySimilarity(
  metricsA: Map<string, unknown>,
  metricsB: Map<string, unknown>,
): number {
  const activeFactors = FACTOR_REGISTRY.filter(
    (factor) => metricsA.has(factor.type) && metricsB.has(factor.type),
  );
  if (activeFactors.length === 0) return 0;

  const total = activeFactors.reduce(
    (sum, factor) => sum + factor.compute(metricsA.get(factor.type), metricsB.get(factor.type)),
    0,
  );
  return total / activeFactors.length;
}
