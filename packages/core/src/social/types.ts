import type { Wuxing } from '../bazi/types';
import type { BigFiveDomain } from '../psychology/bigfive/types';

export type WuxingVector = Record<Wuxing, number>;

export type BigFiveVector = Record<BigFiveDomain, number>;

/**
 * 每个人格维度（五行/大五/……）独立成一个可插拔因子。
 * 新增维度时只需实现一个 SimilarityFactor 并注册进 FACTOR_REGISTRY，
 * 不改动合并逻辑（combinePersonalitySimilarity）。
 */
export interface SimilarityFactor {
  /** 与 mind_card_metrics.metric_type 对应 */
  type: string;
  /** 0~1，1为最相似。仅在双方该维度数据都存在时才会被调用 */
  compute(a: unknown, b: unknown): number;
}
