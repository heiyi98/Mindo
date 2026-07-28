import type { BigFiveDomain } from '../../psychology/bigfive/types';
import type { BigFiveVector } from '../types';

const DOMAIN_LIST: BigFiveDomain[] = ['O', 'C', 'E', 'A', 'N'];

// IPIP-NEO-120：每 domain 6 facet × 4题，每题1-5分，反向计分已在计分阶段处理，
// 所以每个 domain 原始分范围固定是 [24, 120]，跟五行不同，不存在特殊格局的尺度问题。
const DOMAIN_SCORE_RANGE = 120 - 24;
const MAX_DISTANCE = Math.sqrt(DOMAIN_LIST.length * DOMAIN_SCORE_RANGE * DOMAIN_SCORE_RANGE);

/**
 * 从 bigfive_assessments.domain_scores（已经是 Record<BigFiveDomain, number>）直接转成向量，
 * 供发布卡片时写入 mind_card_metrics.metric_data，以及后续相似度比较使用。
 */
export function toBigFiveVector(domainScores: Record<string, number>): BigFiveVector {
  const vector = { O: 0, C: 0, E: 0, A: 0, N: 0 } as BigFiveVector;
  for (const d of DOMAIN_LIST) {
    vector[d] = domainScores[d] ?? 0;
  }
  return vector;
}

/**
 * 归一化欧氏距离，映射到 0~1。五个domain分数尺度一致（都是24~120），
 * 不像五行那样存在特殊格局的尺度不统一问题，直接用几何距离即可。
 */
export function bigFiveSimilarity(a: BigFiveVector, b: BigFiveVector): number {
  let sumSquares = 0;
  for (const d of DOMAIN_LIST) {
    const diff = a[d] - b[d];
    sumSquares += diff * diff;
  }
  const distance = Math.sqrt(sumSquares);
  return 1 - Math.min(1, distance / MAX_DISTANCE);
}
