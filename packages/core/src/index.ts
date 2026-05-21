// 八字命理
export { analyzeBazi, toBaziSnapshot } from './bazi/analysis';
export type {
  BaziAnalysis,
  BaziSnapshot,
  BaziMeta,
  Wuxing, TianGan, DiZhi, ShiShen, EnergyNode, ShiShenInfluenceGroup,
} from './bazi/types';
export * from './bazi/engine';
export * from './bazi/timeline';

// 心理测量
export { calculateBigFive, calculateBigFiveWithLocale, getQuestionCount } from './psychology/bigfive';
export { buildQuestions, getQuestionItemsForLocale } from './psychology/bigfive/alheimsins';
export type { BigFiveQuestion } from './psychology/bigfive/alheimsins';
export type {
  BigFiveDomain,
  BigFiveFacet,
  UserAnswer as BigFiveUserAnswer,
  BigFiveReport,
  DomainResult as BigFiveDomainResult,
  FacetResult as BigFiveFacetResult,
} from './psychology/bigfive/types';
export { ipipNeo120Dictionary } from './psychology/bigfive/dictionary';

// 西洋星盘
export { calculateStarChart, calculateDateMode, calculateFullMode } from './astrology/western';
export type {
  StarChartResult,
  DateModeResult,
  FullModeResult,
  PlanetPosition,
  PlanetPosition as WesternPlanetPosition,
  HouseCusp,
  Angles,
  ZodiacSign,
  PlanetName,
  HouseSystem,
  DateModeInput as WesternDateModeInput,
  FullModeInput as WesternFullModeInput,
  MoonShiftWarning,
} from './astrology/western/types';
