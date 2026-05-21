import type { QuestionItem } from './types';

const FACET_MAP: Record<string, Record<number, string>> = {
  N: { 1: 'Anxiety', 2: 'Anger', 3: 'Depression', 4: 'SelfConsciousness', 5: 'Immoderation', 6: 'Vulnerability' },
  E: { 1: 'Friendliness', 2: 'Gregariousness', 3: 'Assertiveness', 4: 'ActivityLevel', 5: 'ExcitementSeeking', 6: 'Cheerfulness' },
  O: { 1: 'Imagination', 2: 'ArtisticInterests', 3: 'Emotionality', 4: 'Adventurousness', 5: 'Intellect', 6: 'Liberalism' },
  A: { 1: 'Trust', 2: 'Morality', 3: 'Altruism', 4: 'Cooperation', 5: 'Modesty', 6: 'Sympathy' },
  C: { 1: 'SelfEfficacy', 2: 'Orderliness', 3: 'Dutifulness', 4: 'AchievementStriving', 5: 'SelfDiscipline', 6: 'Cautiousness' },
};

// 题目逻辑顺序：N(1-24), E(25-48), O(49-72), A(73-96), C(97-120)
// 每个domain 6个facet，每个facet 4道题（交替正反向）
const QUESTION_ORDER: { domain: string; facet: number; direction: number }[] = [];

const DOMAIN_ORDER = ['N', 'E', 'O', 'A', 'C'];
for (const domain of DOMAIN_ORDER) {
  for (let facet = 1; facet <= 6; facet++) {
    QUESTION_ORDER.push({ domain, facet, direction: 1 });
    QUESTION_ORDER.push({ domain, facet, direction: -1 });
    QUESTION_ORDER.push({ domain, facet, direction: 1 });
    QUESTION_ORDER.push({ domain, facet, direction: -1 });
  }
}

export interface BigFiveQuestion {
  id: string;
  text: string;
  domain: string;
  facet: string;
  direction: number;
}

export function buildQuestions(
  questionTexts: Record<string, string>
): BigFiveQuestion[] {
  return QUESTION_ORDER.map((meta, index) => {
    const id = `q${String(index + 1).padStart(3, '0')}`;
    const facetName = FACET_MAP[meta.domain][meta.facet];
    return {
      id,
      text: questionTexts[id] || id,
      domain: meta.domain,
      facet: facetName,
      direction: meta.direction,
    };
  });
}

// 保留向后兼容的导出
export function getQuestionItemsForLocale(_locale: string): QuestionItem[] {
  // 此函数不再使用，题目文本由前端从翻译文件读取
  return [];
}
