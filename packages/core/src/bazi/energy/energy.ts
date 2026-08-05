// ═══════════════════════════════════════════════════════════════════════════
// 专利数值层——独立能量计算 + 十神影响力汇总
// 本文件承载核心量化算法（月令系数×通根系数的能量公式、十神影响力汇总），
// 可以读取 ../structure.ts 的产出，但 ../structure.ts 不得反向依赖本文件。
// ═══════════════════════════════════════════════════════════════════════════
import type {
  Wuxing, GongWeiPos, EnergyNode, ShiShenNode, ShiShenInfluenceGroup,
} from '../types';
import { YUELING_COEFF } from '../constants';
import type { BaziStructure } from '../structure';

export interface EnergyResult {
  energyNodes: EnergyNode[];
  shishenInfluence: ShiShenInfluenceGroup[];
  dayMasterEnergy: number;
}

export function computeEnergyAndInfluence(structure: BaziStructure): EnergyResult {
  const { yuelingWuxing, tianGanNodes, cangGanNodes, touGenResults, cangGanVisibility, shishenMap, tianGanHeResults } = structure;

  // 合绊天干位置集合（从 structure 的分类结果里反推，日干始终例外）
  const hebanStemPos = new Set<GongWeiPos>(
    tianGanHeResults
      .filter(r => r.result === 'HeBan')
      .flatMap(r => [r.stem1Pos, r.stem2Pos])
  );

  // ═══════════════════════════════════════════════════════
  // 独立能量计算
  // 天干：energy = 30 × 月令系数 × (1 + 分配通根系数)，
  //       分配通根系数 = totalTougenCoeff / 同五行天干数，上限3
  // 藏干：energy = baseScore × 月令系数（移除透出乘数）
  // ═══════════════════════════════════════════════════════
  const energyNodes: EnergyNode[] = [];

  for (const stemNode of tianGanNodes) {
    const tougenResult = touGenResults.find(t => t.stemPos === stemNode.pos);
    const totalTougenCoeff = tougenResult?.totalTougenCoeff ?? 0;
    const yuelingCoeff = YUELING_COEFF[yuelingWuxing][stemNode.wuxing];
    const sameWuxingCount = tianGanNodes.filter(n => n.wuxing === stemNode.wuxing).length;
    const allocatedCoeff = totalTougenCoeff / sameWuxingCount;
    const cappedCoeff = Math.min(allocatedCoeff, 3);
    const energy = 30 * yuelingCoeff * (1 + cappedCoeff); // 基础分(30) × 月令系数 × (1 + 分配通根系数)

    const isHeBan = hebanStemPos.has(stemNode.pos);
    const outputEnabled = !isHeBan || stemNode.pos === 'DayStem';

    energyNodes.push({
      id: stemNode.id,
      type: 'TianGan',
      pos: stemNode.pos,
      stem: stemNode.stem,
      wuxing: stemNode.wuxing,
      yinyang: stemNode.yinyang,
      baseScore: 30,
      yuelingCoeff,
      tougenCoeff: totalTougenCoeff,
      energy,
      outputEnabled,
      disableReason: isHeBan && stemNode.pos !== 'DayStem' ? 'HeBan' : undefined,
    });
  }

  for (const cgNode of cangGanNodes) {
    const visibility = cangGanVisibility.find(v => v.cangganId === cgNode.id);
    const isMuKuLocked = visibility?.isMuKuLocked ?? false;
    const yuelingCoeff = YUELING_COEFF[yuelingWuxing][cgNode.wuxing];
    const energy = cgNode.baseScore * yuelingCoeff; // 藏干基础分 × 月令系数，不含透出加成

    energyNodes.push({
      id: cgNode.id,
      type: 'CangGan',
      pos: cgNode.branchPos,
      stem: cgNode.stem,
      wuxing: cgNode.wuxing,
      yinyang: cgNode.yinyang,
      baseScore: cgNode.baseScore,
      yuelingCoeff,
      tougenCoeff: 0,
      energy,
      outputEnabled: !isMuKuLocked,
      disableReason: isMuKuLocked ? 'MuKuLocked' : undefined,
    });
  }

  // ═══════════════════════════════════════════════════════
  // 十神影响力总值
  // ═══════════════════════════════════════════════════════
  const shishenById = new Map(shishenMap.map((n: ShiShenNode) => [n.id, n.shishen]));
  const shishenGroups = new Map<string, ShiShenInfluenceGroup['nodes']>();
  let dayMasterEnergy = 0;

  for (const node of energyNodes) {
    if (node.pos === 'DayStem' && node.type === 'TianGan') {
      dayMasterEnergy = node.energy;
      continue;
    }
    if (!node.outputEnabled) continue;

    const influence = node.energy;
    const ss = shishenById.get(node.id);
    if (!ss) continue;

    if (!shishenGroups.has(ss)) shishenGroups.set(ss, []);
    shishenGroups.get(ss)!.push({
      id: node.id,
      energy: node.energy,
      influence,
    });
  }

  const shishenInfluence: ShiShenInfluenceGroup[] = [];
  for (const [shishen, nodes] of shishenGroups) {
    shishenInfluence.push({
      shishen: shishen as ShiShenInfluenceGroup['shishen'],
      nodes,
      totalInfluence: nodes.reduce((sum, n) => sum + n.influence, 0),
    });
  }

  return { energyNodes, shishenInfluence, dayMasterEnergy };
}
