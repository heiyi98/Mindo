// ═══════════════════════════════════════════════════════════════════════════
// 接线层——组装公有结构层（structure.ts）与专利数值层（energy/），
// 对外提供 analyzeBazi() / toBaziSnapshot() 这两个稳定接口，
// 下游（page.tsx / preparePhase1Input.ts / 仪表盘卡片等）调用方式不变。
// 本文件本身不写任何命理判断或数值计算逻辑，只负责按正确顺序接线组装。
// ═══════════════════════════════════════════════════════════════════════════
import type { BaziAnalysis, BaziMeta, BaziSnapshot, Wuxing } from './types';
import { buildBaziStructure } from './structure';
import { computeEnergyAndInfluence } from './energy/energy';
import { computeWuxingAssessment } from './energy/yongshen';

export function analyzeBazi(pillars: BaziAnalysis['pillars']): BaziAnalysis {
  const structure = buildBaziStructure(pillars);
  const { energyNodes, shishenInfluence, dayMasterEnergy } = computeEnergyAndInfluence(structure);

  return {
    pillars: structure.pillars,
    yuelingWuxing: structure.yuelingWuxing,
    tianGanNodes: structure.tianGanNodes,
    cangGanNodes: structure.cangGanNodes,
    tianGanHeResults: structure.tianGanHeResults,
    tianGanChongResults: structure.tianGanChongResults,
    diZhiRelations: structure.diZhiRelations,
    touGenResults: structure.touGenResults,
    cangGanVisibility: structure.cangGanVisibility,
    energyNodes,
    shishenMap: structure.shishenMap,
    shishenInfluence,
    dayMasterEnergy,
    pattern: structure.pattern,
  };
}

export function toBaziSnapshot(
  analysis: BaziAnalysis,
  meta: BaziMeta,
  energyScores: Record<Wuxing, number>
): BaziSnapshot {
  const relations = {
    tianGanHe:      analysis.tianGanHeResults,
    tianGanChong:   analysis.tianGanChongResults,
    diZhiRelations: analysis.diZhiRelations,
  };

  return {
    meta,
    pillars: {
      year:  analysis.pillars.year,
      month: analysis.pillars.month,
      day:   analysis.pillars.day,
      hour:  analysis.pillars.hour,
      yuelingWuxing: analysis.yuelingWuxing,
      tianGanNodes: analysis.tianGanNodes,
      cangGanNodes: analysis.cangGanNodes,
    },
    relations,
    tougen: {
      touGenResults:     analysis.touGenResults,
      cangGanVisibility: analysis.cangGanVisibility,
    },
    energy: {
      energyNodes: analysis.energyNodes,
    },
    shishen: {
      shishenMap: analysis.shishenMap,
    },
    influence: {
      shishenInfluence: analysis.shishenInfluence,
      dayMasterEnergy:  analysis.dayMasterEnergy,
    },
    dayStem:          analysis.pillars.day.stem,
    energyScores,
    pattern:          analysis.pattern,
    wuxingAssessment: computeWuxingAssessment({
      dayStem: analysis.pillars.day.stem,
      energy:  { energyNodes: analysis.energyNodes },
      shishen: { shishenMap: analysis.shishenMap },
      pattern: analysis.pattern,
      relations,
    }),
  };
}
