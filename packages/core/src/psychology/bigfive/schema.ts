import { z } from 'zod';

export const bigFiveDomainSchema = z.enum(['O', 'C', 'E', 'A', 'N']);

export const bigFiveFacetSchema = z.enum([
  'Anxiety', 'Anger', 'Depression', 'SelfConsciousness', 'Immoderation', 'Vulnerability',
  'Friendliness', 'Gregariousness', 'Assertiveness', 'ActivityLevel', 'ExcitementSeeking', 'Cheerfulness',
  'Imagination', 'ArtisticInterests', 'Emotionality', 'Adventurousness', 'Intellect', 'Liberalism',
  'Trust', 'Morality', 'Altruism', 'Cooperation', 'Modesty', 'Sympathy',
  'SelfEfficacy', 'Orderliness', 'Dutifulness', 'AchievementStriving', 'SelfDiscipline', 'Cautiousness'
]);

export const userAnswerSchema = z.object({
  questionId: z.string().min(1),
  score: z.number().int().min(1).max(5),
});

export const userAnswersArraySchema = z.array(userAnswerSchema).min(1).max(120);

export const facetResultSchema = z.object({
  facet: bigFiveFacetSchema,
  score: z.number().min(0),
});

export const domainResultSchema = z.object({
  domain: bigFiveDomainSchema,
  score: z.number().min(0),
  facets: z.array(facetResultSchema),
});

export const bigFiveReportSchema = z.object({
  domains: z.array(domainResultSchema).length(5),
});
