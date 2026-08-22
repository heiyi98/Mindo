// 通用时间引擎
export * from './time/index';

// 八字命理
export { analyzeBazi, toBaziSnapshot } from './bazi/analysis';
export { preparePhase1Input } from './bazi/preparePhase1Input';
export { buildShishenMetadata } from './bazi/preparePhase1Input';
export { computeWuxingAssessment } from './bazi/energy/yongshen';
export type {
  BaziAnalysis,
  BaziSnapshot,
  BaziMeta,
  Wuxing, TianGan, DiZhi, ShiShen, YinYang, GongWeiPos,
  TianGanHe, TianGanChong, DiZhiRelation,
  TianGanHeResult, DiZhiRelationType,
  EnergyNode, ShiShenInfluenceGroup,
  WuxingAssessment, WuxingRole, WuxingStrengthLabel,
} from './bazi/types';
export * from './bazi/engine';
export * from './bazi/timeline';
export { computeFortuneImbalance, generateLifeChart, getMonthPillar, getDayPillar } from './bazi/fortune';
export type { LinPillar, FortuneGroupEnergies, FortuneResult, MonthScore, YearScore, LifeChartData } from './bazi/fortune';

// 先天体质（Pro）
export { computeConstitution } from './bazi/constitution/index';
export {
  computeRegularEnergyNodes,
  extractZiPingEnergyNodes,
  getSanhuiImmuneWuxing,
  buildManualBaziSnapshot,
  computeLayerOne,
  computeLayerTwo,
  computeLayerThree,
  computeLayerFour,
  yinyangStrengthLabel,
  averageStrengthLabel,
  averageOfPositive,
  fiveConstitutionLabel,
  ORGAN_MAP,
} from './bazi/constitution/index';
export type {
  ConstitutionVersion,
  ConstitutionResult,
  ConstitutionEnergyNode,
  ConstitutionLayerOne,
  ConstitutionLayerTwo,
  ConstitutionLayerThree,
  ConstitutionLayerFour,
  YinYangGroupResult,
  WuxingStaticResult,
  YinYangWuxingStaticResult,
  PrescriptionResult,
  PrescriptionAdvice,
  ManualBirthInput,
  FiveConstitutionType,
  StrengthLabel as ConstitutionStrengthLabel,
} from './bazi/constitution/types';

// 心理测量
export { calculateBigFive, getQuestionCount } from './psychology/bigfive';
export type {
  BigFiveDomain,
  BigFiveFacet,
  UserAnswer as BigFiveUserAnswer,
  BigFiveReport,
  DomainResult as BigFiveDomainResult,
  FacetResult as BigFiveFacetResult,
} from './psychology/bigfive/types';
export { ipipNeo120Dictionary } from './psychology/bigfive/dictionary';

// 社交匹配（片语相似度引擎）
export * from './social/index';

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