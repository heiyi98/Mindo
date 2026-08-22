import type { BaziSnapshot, Wuxing } from '../types';
import type { ConstitutionResult, ConstitutionVersion } from './types';
import { computeRegularEnergyNodes } from './regularEnergy';
import { extractZiPingEnergyNodes, getSanhuiImmuneWuxing } from './ziPingEnergy';
import { computeLayerOne, computeLayerTwo, computeLayerThree, computeLayerFour } from './layers';

export { computeRegularEnergyNodes } from './regularEnergy';
export { extractZiPingEnergyNodes, getSanhuiImmuneWuxing } from './ziPingEnergy';
export { buildManualBaziSnapshot } from './manualInput';
export { computeLayerOne, computeLayerTwo, computeLayerThree, computeLayerFour } from './layers';
export { yinyangStrengthLabel, averageStrengthLabel, averageOfPositive, fiveConstitutionLabel } from './strength';
export { ORGAN_MAP } from './organMapping';
export * from './types';

/**
 * 给定任意来源（账号档案模式或手动输入模式，两者都产出同构的BaziSnapshot）的命盘，
 * 按所选版本算出完整四层结果。常规版绕开BaziSnapshot里已经做过的五合真化/合绊/
 * 墓库锁闭/三会免疫处理，直接用snapshot.pillars重新走一遍不含这些子平专属步骤的计算；
 * 子平版直接复用snapshot既有的energy.energyNodes/relations，不重算。
 */
export function computeConstitution(
  snapshot: BaziSnapshot,
  version: ConstitutionVersion
): ConstitutionResult {
  const nodes =
    version === 'ziping'
      ? extractZiPingEnergyNodes(snapshot)
      : computeRegularEnergyNodes(snapshot.pillars);

  const immuneWuxing = version === 'ziping' ? getSanhuiImmuneWuxing(snapshot) : new Set<Wuxing>();

  const layerOne = computeLayerOne(nodes);
  const layerTwo = computeLayerTwo(nodes);
  const layerThree = computeLayerThree(layerTwo.fiveValues, immuneWuxing);
  const layerFour = computeLayerFour(layerThree, immuneWuxing);

  return { version, layerOne, layerTwo, layerThree, layerFour };
}
