import type { FiveConstitutionType, StrengthLabel, YinYangGroupResult } from './types';

// 阴阳（两类对比）强弱判定，比例法：
// 比值(大/小) <1.5→中，<3→强/弱，≥3→极强/极弱；某一方为0→该方"缺失"，另一方"极强"；两方都为0→都"缺失"
export function yinyangStrengthLabel(
  yangSum: number,
  yinSum: number
): { yang: StrengthLabel; yin: StrengthLabel } {
  if (yangSum === 0 && yinSum === 0) return { yang: '缺失', yin: '缺失' };
  if (yangSum === 0) return { yang: '缺失', yin: '极强' };
  if (yinSum === 0) return { yang: '极强', yin: '缺失' };

  const ratio = Math.max(yangSum, yinSum) / Math.min(yangSum, yinSum);

  if (ratio < 1.5) return { yang: '中', yin: '中' };

  const winnerLabel: StrengthLabel = ratio < 3 ? '强' : '极强';
  const loserLabel: StrengthLabel = ratio < 3 ? '弱' : '极弱';

  return yangSum >= yinSum
    ? { yang: winnerLabel, yin: loserLabel }
    : { yang: loserLabel, yin: winnerLabel };
}

// 五态人（《灵枢·通天》）判定：只读总局阴阳的强弱标签做固定映射，不重新计算强弱、不看天干/地支阴阳。
// "缺失"（某一方为0）在这套映射里等同"极弱"——yinyangStrengthLabel()本身保证"一方缺失时另一方必为极强"，
// 所以"极强+缺失"和"极强+极弱"两种输入天然对应同一个五态人结果，不需要单独分支。
function isWeakOrMissing(label: StrengthLabel): boolean {
  return label === '极弱' || label === '缺失';
}

export function fiveConstitutionLabel(overall: YinYangGroupResult): FiveConstitutionType {
  const { yangLabel, yinLabel } = overall;

  if (yinLabel === '极强' && isWeakOrMissing(yangLabel)) return '太阴之人';
  if (yinLabel === '强' && yangLabel === '弱') return '少阴之人';
  if (yinLabel === '中' && yangLabel === '中') return '阴阳和平之人';
  if (yangLabel === '强' && yinLabel === '弱') return '少阳之人';
  if (yangLabel === '极强' && isWeakOrMissing(yinLabel)) return '太阳之人';

  throw new Error(`无法判定五态人：阳=${yangLabel}，阴=${yinLabel}`);
}

// 五行/十干（多类对比）强弱判定，均值法：相对同组正值均值的倍数
// >2.00极强 / >1.25强 / >0.50中 / >0.25弱 / 否则极弱；value===0→"缺失"
export function averageStrengthLabel(value: number, positiveAvg: number): StrengthLabel {
  if (value === 0) return '缺失';
  if (positiveAvg === 0) return '缺失';

  const ratio = value / positiveAvg;

  if (ratio > 2.0) return '极强';
  if (ratio > 1.25) return '强';
  if (ratio > 0.5) return '中';
  if (ratio > 0.25) return '弱';
  return '极弱';
}

export function averageOfPositive(values: number[]): number {
  const positive = values.filter(v => v > 0);
  if (positive.length === 0) return 0;
  return positive.reduce((sum, v) => sum + v, 0) / positive.length;
}

export function stdev(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}
