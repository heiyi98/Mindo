import { getItems } from '@alheimsins/b5-johnson-120-ipip-neo-pi-r';
import type { QuestionItem } from './types';

const FACET_MAP: Record<string, Record<number, string>> = {
  N: { 1: 'Anxiety', 2: 'Anger', 3: 'Depression', 4: 'SelfConsciousness', 5: 'Immoderation', 6: 'Vulnerability' },
  E: { 1: 'Friendliness', 2: 'Gregariousness', 3: 'Assertiveness', 4: 'ActivityLevel', 5: 'ExcitementSeeking', 6: 'Cheerfulness' },
  O: { 1: 'Imagination', 2: 'ArtisticInterests', 3: 'Emotionality', 4: 'Adventurousness', 5: 'Intellect', 6: 'Liberalism' },
  A: { 1: 'Trust', 2: 'Morality', 3: 'Altruism', 4: 'Cooperation', 5: 'Modesty', 6: 'Sympathy' },
  C: { 1: 'SelfEfficacy', 2: 'Orderliness', 3: 'Dutifulness', 4: 'AchievementStriving', 5: 'SelfDiscipline', 6: 'Cautiousness' },
};

// 语言代码映射：zh→zh-cn（包不支持vi，降级为en）
const LANG_MAP: Record<string, string> = {
  zh: 'zh-cn',
  en: 'en',
  fr: 'fr',
  es: 'es',
  ja: 'ja',
  ko: 'ko',
  it: 'it',
  de: 'de',
};

export interface AlheimsinsQuestion {
  id: string;
  text: string;
  domain: string;
  facet: number;
  keyed: string;
}

export function getAlheimsinsItems(locale: string): AlheimsinsQuestion[] {
  const lang = LANG_MAP[locale] || 'en';
  try {
    return getItems(lang) as AlheimsinsQuestion[];
  } catch {
    return getItems('en') as AlheimsinsQuestion[];
  }
}

export function convertToQuestionItems(items: AlheimsinsQuestion[]): QuestionItem[] {
  return items.map(item => ({
    id: item.id,
    domain: item.domain as any,
    facet: FACET_MAP[item.domain]?.[item.facet] as any,
    direction: item.keyed === 'plus' ? 1 : -1,
  }));
}

export function getQuestionItemsForLocale(locale: string): QuestionItem[] {
  return convertToQuestionItems(getAlheimsinsItems(locale));
}
