// ═══════════════════════════════════════════════════════════════════════════
// 子平版——直接复用现成的 BaziSnapshot 产物，不重算：
// 已经过五合真化/合绊判定/墓库锁闭判定的 energy.energyNodes（outputEnabled筛过），
// 三会免疫从 relations.diZhiRelations 里直接收集（本模块在五行层面操作，
// 不需要 bazi/energy/yongshen.ts 那套相对日主的 ABCDE 分组映射，比它更直接）。
// ═══════════════════════════════════════════════════════════════════════════
import type { BaziSnapshot, Wuxing } from '../types';
import type { ConstitutionEnergyNode } from './types';

export function extractZiPingEnergyNodes(snapshot: BaziSnapshot): ConstitutionEnergyNode[] {
  return snapshot.energy.energyNodes
    .filter(n => n.outputEnabled)
    .map(n => ({ type: n.type, wuxing: n.wuxing, yinyang: n.yinyang, energy: n.energy }));
}

export function getSanhuiImmuneWuxing(snapshot: BaziSnapshot): Set<Wuxing> {
  const immune = new Set<Wuxing>();
  for (const r of snapshot.relations.diZhiRelations) {
    if (r.type === 'SanHui' && r.wuxing) immune.add(r.wuxing);
  }
  return immune;
}
