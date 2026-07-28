import type { Wuxing, WuxingAssessment } from '../../bazi/types';
import type { WuxingVector } from '../types';

const WUXING_LIST: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

/**
 * 把 computeWuxingAssessment() 的输出（5元素数组，按effect降序）转成 keyed 向量，
 * 供发布卡片时写入 mind_card_metrics.metric_data，以及后续相似度比较使用。
 */
export function toWuxingVector(assessment: WuxingAssessment[]): WuxingVector {
  const vector = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 } as WuxingVector;
  for (const item of assessment) {
    vector[item.wuxing] = item.effect;
  }
  return vector;
}

/**
 * 余弦相似度，映射到 0~1。
 * 选余弦而非欧氏距离：特殊格局（从格/化气/专旺）的effect取值范围是标定过的[-0.6,1]，
 * 普通格局的effect是baseScore尺度下的原始能量差，量纲不统一——余弦相似度只看方向
 * 不看模长，天然不受这个尺度差影响；欧氏距离会被放大/缩小干扰。
 */
export function wuxingSimilarity(a: WuxingVector, b: WuxingVector): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const w of WUXING_LIST) {
    dot += a[w] * b[w];
    normA += a[w] * a[w];
    normB += b[w] * b[w];
  }
  if (normA === 0 || normB === 0) return 0;
  const cosine = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return (cosine + 1) / 2;
}
