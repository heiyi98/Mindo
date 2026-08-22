import type { Wuxing, YinYang } from '../types';

export type ConstitutionVersion = 'regular' | 'ziping';

export type StrengthLabel = '极强' | '强' | '中' | '弱' | '极弱' | '缺失';

// 五态人（《灵枢·通天》），由总局阴阳强弱标签固定映射得出，不经AI判断，见 strength.ts 的 fiveConstitutionLabel()
export type FiveConstitutionType = '太阴之人' | '少阴之人' | '阴阳和平之人' | '少阳之人' | '太阳之人';

// 常规版/子平版共用的能量节点最小形状——常规版由 regularEnergy.ts 现算，
// 子平版直接从既有 BaziSnapshot.energy.energyNodes 转换而来（见 ziPingEnergy.ts）
export interface ConstitutionEnergyNode {
  type: 'TianGan' | 'CangGan';
  wuxing: Wuxing;
  yinyang: YinYang;
  energy: number;
}

export interface YinYangGroupResult {
  yangSum: number;
  yinSum: number;
  yangLabel: StrengthLabel;
  yinLabel: StrengthLabel;
}

// 层一：阴阳层
export interface ConstitutionLayerOne {
  overall: YinYangGroupResult; // 一.一 总局阴阳
  tianGan: YinYangGroupResult; // 一.二 天干阳总/阴总
  cangGan: YinYangGroupResult; // 一.二 地支（藏干）阳总/阴总
  fiveConstitution: FiveConstitutionType; // 一.一 总局阴阳固定映射出的五态人
}

export interface WuxingStaticResult {
  wuxing: Wuxing;
  value: number;
  label: StrengthLabel;
}

export interface YinYangWuxingStaticResult {
  yinyang: YinYang;
  wuxing: Wuxing;
  value: number;
  label: StrengthLabel;
  organ: string; // 二.三 脏腑映射
}

// 层二：静态阴阳五行层
export interface ConstitutionLayerTwo {
  fiveValues: Record<Wuxing, number>;       // 二.一 原始数值，供层三使用
  fiveResults: WuxingStaticResult[];        // 二.一 五行五个静态值+强弱标签
  tenResults: YinYangWuxingStaticResult[];  // 二.二+二.三 十个值+强弱标签+脏腑
}

// 层三：动态五行层——五个源头相互按链式反应系数真实传播叠加后的调整值
export type ConstitutionLayerThree = Record<Wuxing, number>;

export type PrescriptionAdvice = 'supplement' | 'reduce' | 'neutral'; // 宜补/宜泻/持平

export interface PrescriptionResult {
  wuxing: Wuxing;
  advice: PrescriptionAdvice;
  stdBefore: number;
  stdAfter: number;
}

// 层四：处方层
export type ConstitutionLayerFour = PrescriptionResult[];

export interface ConstitutionResult {
  version: ConstitutionVersion;
  layerOne: ConstitutionLayerOne;
  layerTwo: ConstitutionLayerTwo;
  layerThree: ConstitutionLayerThree;
  layerFour: ConstitutionLayerFour;
}

export interface ManualBirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}
