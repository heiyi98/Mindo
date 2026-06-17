export const BIGFIVE_COLORS = {
  OPENNESS:          '#8E44AD',
  CONSCIENTIOUSNESS: '#2980B9',
  EXTRAVERSION:      '#E67E22',
  AGREEABLENESS:     '#1ABC9C',
  NEUROTICISM:       '#E74C3C',
} as const;

// OCEAN 顺序，顶部 O 顺时针
export const DOMAIN_ORDER = [
  'OPENNESS', 'CONSCIENTIOUSNESS', 'EXTRAVERSION', 'AGREEABLENESS', 'NEUROTICISM',
] as const;

// 每个域下的子维度（OCEAN 顺序，每组内保持原 IPIP 排列）
export const DOMAIN_FACETS: Record<string, string[]> = {
  OPENNESS:          ['Imagination', 'ArtisticInterests', 'Emotionality', 'Adventurousness', 'Intellect', 'Liberalism'],
  CONSCIENTIOUSNESS: ['SelfEfficacy', 'Orderliness', 'Dutifulness', 'AchievementStriving', 'SelfDiscipline', 'Cautiousness'],
  EXTRAVERSION:      ['Friendliness', 'Gregariousness', 'Assertiveness', 'ActivityLevel', 'ExcitementSeeking', 'Cheerfulness'],
  AGREEABLENESS:     ['Trust', 'Morality', 'Altruism', 'Cooperation', 'Modesty', 'Sympathy'],
  NEUROTICISM:       ['Anxiety', 'Anger', 'Depression', 'SelfConsciousness', 'Immoderation', 'Vulnerability'],
};

// domain_scores 字段使用字母 key（full → letter）
export const DOMAIN_LETTER: Record<string, string> = {
  OPENNESS: 'O', CONSCIENTIOUSNESS: 'C', EXTRAVERSION: 'E',
  AGREEABLENESS: 'A', NEUROTICISM: 'N',
};

// letter → full name（便于 BigFiveFacets 等组件反向查找）
export const DOMAIN_FULL: Record<string, string> = Object.fromEntries(
  Object.entries(DOMAIN_LETTER).map(([full, letter]) => [letter, full])
);
