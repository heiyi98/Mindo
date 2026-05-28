import type { BaziSnapshot, GongWeiPos } from './types';
import { computeWuxingAssessment } from './yongshen';

type StrengthLabel = '极强' | '强' | '中' | '弱' | '极弱' | '缺失';

function getStrengthLabel(value: number, mean: number): StrengthLabel {
  if (value === 0) return '缺失';
  if (value > mean * 2.00) return '极强';
  if (value > mean * 1.25) return '强';
  if (value > mean * 0.50) return '中';
  if (value > mean * 0.25) return '弱';
  return '极弱';
}

// energyNodes 中每个节点已有 pos: GongWeiPos，直接用 pos 映射
const PALACE_LABEL: Record<GongWeiPos, string> = {
  YearStem:    '年柱', YearBranch:  '年柱',
  MonthStem:   '月柱', MonthBranch: '月柱',
  DayStem:     '日柱', DayBranch:   '日柱',
  HourStem:    '时柱', HourBranch:  '时柱',
};

const POSITION_LABEL: Record<GongWeiPos, string> = {
  YearStem:    '年干', YearBranch:  '年支',
  MonthStem:   '月干', MonthBranch: '月支',
  DayStem:     '日干', DayBranch:   '日支',
  HourStem:    '时干', HourBranch:  '时支',
};

export function preparePhase1Input(snapshot: BaziSnapshot): object {
  const activeInfluences = snapshot.influence.shishenInfluence.filter(g => g.totalInfluence > 0);
  const mean = activeInfluences.length > 0
    ? activeInfluences.reduce((s, g) => s + g.totalInfluence, 0) / activeInfluences.length
    : 0;

  const shishenWithStrength = snapshot.influence.shishenInfluence.map(g => ({
    ...g,
    strength: getStrengthLabel(g.totalInfluence, mean),
  }));

  const nodesWithPalace = snapshot.energy.energyNodes.map(n => ({
    ...n,
    palace: PALACE_LABEL[n.pos],
    positionLabel: POSITION_LABEL[n.pos],
  }));

  const wuxingAssessment = computeWuxingAssessment(snapshot);

  return {
    dayStem: snapshot.dayStem,
    energyScores: snapshot.energyScores,
    shishenInfluence: shishenWithStrength,
    tougen: snapshot.tougen,
    relations: snapshot.relations,
    energyNodes: nodesWithPalace,
    wuxingAssessment,
  };
}
