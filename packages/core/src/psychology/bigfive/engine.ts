import {
  UserAnswer,
  BigFiveReport,
  BigFiveDomain,
  BigFiveFacet,
  DomainResult,
  FacetResult,
  QuestionItem,
} from './types';
import { ipipNeo120Dictionary } from './dictionary';
import { bigFiveReportSchema } from './schema';

const DOMAIN_FACETS: Record<BigFiveDomain, BigFiveFacet[]> = {
  N: ['Anxiety', 'Anger', 'Depression', 'SelfConsciousness', 'Immoderation', 'Vulnerability'],
  E: ['Friendliness', 'Gregariousness', 'Assertiveness', 'ActivityLevel', 'ExcitementSeeking', 'Cheerfulness'],
  O: ['Imagination', 'ArtisticInterests', 'Emotionality', 'Adventurousness', 'Intellect', 'Liberalism'],
  A: ['Trust', 'Morality', 'Altruism', 'Cooperation', 'Modesty', 'Sympathy'],
  C: ['SelfEfficacy', 'Orderliness', 'Dutifulness', 'AchievementStriving', 'SelfDiscipline', 'Cautiousness'],
};

export function calculateBigFive(
  answers: UserAnswer[],
  questionItems?: QuestionItem[]
): BigFiveReport {
  const dictionary = questionItems || ipipNeo120Dictionary;
  const scores: Record<BigFiveDomain, Partial<Record<BigFiveFacet, number>>> = {
    N: {}, E: {}, O: {}, A: {}, C: {},
  };

  answers.forEach((answer) => {
    const question = dictionary.find(q => q.id === answer.questionId);
    if (!question) return;
    const actualScore = question.direction === 1
      ? answer.score
      : (6 - answer.score);
    const current = scores[question.domain][question.facet] || 0;
    scores[question.domain][question.facet] = current + actualScore;
  });

  const domains: BigFiveDomain[] = ['N', 'E', 'O', 'A', 'C'];

  const reportData: BigFiveReport = {
    domains: domains.map((d): DomainResult => {
      const facets: FacetResult[] = DOMAIN_FACETS[d].map(facet => ({
        facet,
        score: scores[d][facet] || 0,
      }));
      return {
        domain: d,
        score: facets.reduce((sum, f) => sum + f.score, 0),
        facets,
      };
    }),
  };

  return bigFiveReportSchema.parse(reportData);
}

export function getQuestionCount(): number {
  return ipipNeo120Dictionary.length;
}
