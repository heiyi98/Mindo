export type Wuxing = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export type TianGan =
  | 'Jia' | 'Yi' | 'Bing' | 'Ding' | 'Wu'
  | 'Ji' | 'Geng' | 'Xin' | 'Ren' | 'Gui';

export type DiZhi =
  | 'Zi' | 'Chou' | 'Yin' | 'Mao' | 'Chen' | 'Si'
  | 'Wu' | 'Wei' | 'Shen' | 'You' | 'Xu' | 'Hai';

export type ShiShen =
  | 'BiJian' | 'JieCai' | 'ShiShen' | 'ShangGuan'
  | 'PianCai' | 'ZhengCai' | 'QiSha' | 'ZhengGuan'
  | 'PianYin' | 'ZhengYin' | 'DayMaster';

export type QiWei = 'BenQi' | 'ZhongQi' | 'YuQi';

export type YinYang = 'Yang' | 'Yin';

export type GongWeiPos =
  | 'YearStem' | 'YearBranch'
  | 'MonthStem' | 'MonthBranch'
  | 'DayStem' | 'DayBranch'
  | 'HourStem' | 'HourBranch';

export type TianGanHeResult =
  | 'ZhenHua'
  | 'HeBan'
  | 'ZhengHe'
  | 'DuHe';

export type DiZhiRelationType =
  | 'SanHui' | 'SanHe' | 'BanHe' | 'GongHe'
  | 'LiuHe' | 'LiuChong'
  | 'Xing' | 'Hai' | 'Po';

export interface CangGanNode {
  id: string;
  branchPos: GongWeiPos;
  branch: DiZhi;
  stem: TianGan;
  wuxing: Wuxing;
  yinyang: YinYang;
  qi: QiWei;
  baseScore: number;
}

export interface TianGanNode {
  id: string;
  pos: GongWeiPos;
  stem: TianGan;
  wuxing: Wuxing;
  yinyang: YinYang;
}

export interface TianGanHe {
  stem1: TianGan;
  stem1Pos: GongWeiPos;
  stem2: TianGan;
  stem2Pos: GongWeiPos;
  huashen: Wuxing;
  result: TianGanHeResult;
}

export interface TianGanChong {
  stem1: TianGan;
  stem1Pos: GongWeiPos;
  stem2: TianGan;
  stem2Pos: GongWeiPos;
}

export interface DiZhiRelation {
  type: DiZhiRelationType;
  branches: DiZhi[];
  positions: GongWeiPos[];
  wuxing?: Wuxing;
  note?: string;
}

export interface TouGenRoot {
  branchPos: GongWeiPos;
  branch: DiZhi;
  cangganId: string;
  cangganStem: TianGan;
  qi: QiWei;
  baseScore: number;
  tougenCoeff: number;
}

export interface TouGenResult {
  stemPos: GongWeiPos;
  stem: TianGan;
  wuxing: Wuxing;
  roots: TouGenRoot[];
  totalTougenCoeff: number;
  tag: 'TongGen' | 'Lu';
}

export interface CangGanVisibility {
  cangganId: string;
  branchPos: GongWeiPos;
  stem: TianGan;
  qi: QiWei;
  tag: 'TouChu' | 'Cang';
  isMuKuLocked: boolean;
}

export interface EnergyNode {
  id: string;
  type: 'TianGan' | 'CangGan';
  pos: GongWeiPos;
  stem: TianGan;
  wuxing: Wuxing;
  yinyang: YinYang;
  baseScore: number;
  yuelingCoeff: number;
  tougenCoeff: number;
  energy: number;
  outputEnabled: boolean;
  disableReason?: 'HeBan' | 'MuKuLocked';
}

export interface ShiShenNode {
  id: string;
  shishen: ShiShen;
}

export interface ShiShenInfluenceGroup {
  shishen: ShiShen;
  nodes: {
    id: string;
    energy: number;
    weight: number;
    influence: number;
  }[];
  totalInfluence: number;
}

export interface BaziAnalysis {
  pillars: {
    year:  { stem: TianGan; branch: DiZhi };
    month: { stem: TianGan; branch: DiZhi };
    day:   { stem: TianGan; branch: DiZhi };
    hour?: { stem: TianGan; branch: DiZhi };
  };
  yuelingWuxing: Wuxing;
  tianGanNodes: TianGanNode[];
  cangGanNodes: CangGanNode[];
  tianGanHeResults: TianGanHe[];
  tianGanChongResults: TianGanChong[];
  diZhiRelations: DiZhiRelation[];
  touGenResults: TouGenResult[];
  cangGanVisibility: CangGanVisibility[];
  energyNodes: EnergyNode[];
  shishenMap: ShiShenNode[];
  shishenInfluence: ShiShenInfluenceGroup[];
  dayMasterEnergy: number;
  pattern?: PatternResult;
  yongshen?: YongshenResult;
}

export interface BaziMeta {
  solarTime: string;
  lunarTime: string;
  jieQi: string;
}

export interface BaziPillarsSegment {
  year:  { stem: TianGan; branch: DiZhi };
  month: { stem: TianGan; branch: DiZhi };
  day:   { stem: TianGan; branch: DiZhi };
  hour?: { stem: TianGan; branch: DiZhi };
  yuelingWuxing: Wuxing;
  tianGanNodes: TianGanNode[];
  cangGanNodes: CangGanNode[];
}

export interface BaziRelationsSegment {
  tianGanHe: TianGanHe[];
  tianGanChong: TianGanChong[];
  diZhiRelations: DiZhiRelation[];
}

export interface BaziTougenSegment {
  touGenResults: TouGenResult[];
  cangGanVisibility: CangGanVisibility[];
}

export interface BaziEnergySegment {
  energyNodes: EnergyNode[];
}

export interface BaziShishenSegment {
  shishenMap: ShiShenNode[];
}

export interface BaziInfluenceSegment {
  shishenInfluence: ShiShenInfluenceGroup[];
  dayMasterEnergy: number;
}

export interface PatternResult {
  category: 'huaqi' | 'zhuanwang' | 'cong' | 'normal';
  name: string;
}

export interface YongshenResult {
  wuxing: Wuxing;
  yinyang: YinYang;
  shishen: ShiShen;
}

// 七段式完整存储结构
export interface BaziSnapshot {
  meta: BaziMeta;
  pillars: BaziPillarsSegment;
  relations: BaziRelationsSegment;
  tougen: BaziTougenSegment;
  energy: BaziEnergySegment;
  shishen: BaziShishenSegment;
  influence: BaziInfluenceSegment;
  // 前端展示用（冗余但方便）
  dayStem: TianGan;
  energyScores: Record<Wuxing, number>;
  pattern?: PatternResult;
  yongshen?: YongshenResult;
}
