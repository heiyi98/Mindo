// ═══════════════════════════════════════════════════════════════════════════
// 手动输入模式——不查 bazi_snapshots，不经过 packages/core/src/time 真太阳时引擎
// （面向专业人士使用，用户自行判断真太阳时误差是否可接受，不需要出生地字段）。
// 直接把原始输入时间构造成 baziEngine.calculate() 需要的形状喂给它，
// 产出跟账号档案模式同构的 BaziSnapshot，下游四层计算不关心来源。
// ═══════════════════════════════════════════════════════════════════════════
import { baziEngine } from '../engine';
import { analyzeBazi, toBaziSnapshot } from '../analysis';
import type { BaziSnapshot, TianGan, DiZhi, Wuxing } from '../types';
import type { ManualBirthInput } from './types';

export function buildManualBaziSnapshot(input: ManualBirthInput): BaziSnapshot {
  const { year, month, day, hour, minute } = input;

  const pad = (n: number) => String(n).padStart(2, '0');
  const solarTimeStr = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;

  const raw = baziEngine.calculate({
    year,
    month,
    day,
    hour,
    minute,
    solarTimeStr,
    isTimeUnknown: false,
    isMinuteUnknown: false,
  });

  const analysis = analyzeBazi({
    year: { stem: raw.pillars.year.stem as TianGan, branch: raw.pillars.year.branch as DiZhi },
    month: { stem: raw.pillars.month.stem as TianGan, branch: raw.pillars.month.branch as DiZhi },
    day: { stem: raw.pillars.day.stem as TianGan, branch: raw.pillars.day.branch as DiZhi },
    hour: { stem: raw.pillars.hour.stem as TianGan, branch: raw.pillars.hour.branch as DiZhi },
  });

  const energyScores: Record<Wuxing, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const node of analysis.energyNodes) {
    if (node.outputEnabled) energyScores[node.wuxing] += node.energy;
  }

  return toBaziSnapshot(
    analysis,
    { solarTime: raw.meta.solar_time, lunarTime: raw.meta.lunar_time, jieQi: raw.meta.jie_qi },
    energyScores
  );
}
