// 可调运营参数：48小时后新鲜度降到0.5，与候选池窗口（14天，见 apps/web 的
// CANDIDATE_POOL_WINDOW_DAYS）配合，窗口末尾新鲜度趋近于0
const FRESHNESS_HALF_LIFE_HOURS = 48;
const SIMILARITY_WEIGHT = 0.6;
const FRESHNESS_WEIGHT = 0.4;

/** 指数衰减，发布瞬间=1，每过一个半衰期减半 */
export function computeFreshnessScore(createdAt: string | Date, now: Date = new Date()): number {
  const createdMs = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  const ageHours = Math.max(0, (now.getTime() - createdMs) / 3_600_000);
  return Math.pow(0.5, ageHours / FRESHNESS_HALF_LIFE_HOURS);
}

/** 总排序分数 = 60% 人格相似度 + 40% 时间新鲜度（推荐tab专用，权重为可调运营参数） */
export function combineTotalScore(similarity: number, freshness: number): number {
  return SIMILARITY_WEIGHT * similarity + FRESHNESS_WEIGHT * freshness;
}
