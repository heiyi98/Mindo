export type BigFiveDomain = 'O' | 'C' | 'E' | 'A' | 'N';

export type BigFiveFacet =
  | 'Anxiety' | 'Anger' | 'Depression' | 'SelfConsciousness' | 'Immoderation' | 'Vulnerability'
  | 'Friendliness' | 'Gregariousness' | 'Assertiveness' | 'ActivityLevel' | 'ExcitementSeeking' | 'Cheerfulness'
  | 'Imagination' | 'ArtisticInterests' | 'Emotionality' | 'Adventurousness' | 'Intellect' | 'Liberalism'
  | 'Trust' | 'Morality' | 'Altruism' | 'Cooperation' | 'Modesty' | 'Sympathy'
  | 'SelfEfficacy' | 'Orderliness' | 'Dutifulness' | 'AchievementStriving' | 'SelfDiscipline' | 'Cautiousness';

export type ItemDirection = 1 | -1;

export interface QuestionItem {
  id: string;
  domain: BigFiveDomain;
  facet: BigFiveFacet;
  direction: ItemDirection;
}

export interface UserAnswer {
  questionId: string;
  score: number;
}

export interface FacetResult {
  facet: BigFiveFacet;
  score: number;
}

export interface DomainResult {
  domain: BigFiveDomain;
  score: number;
  facets: FacetResult[];
}

export interface BigFiveReport {
  domains: DomainResult[];
}
