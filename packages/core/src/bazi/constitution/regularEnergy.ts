// ═══════════════════════════════════════════════════════════════════════════
// 常规版能量计算——纯粹五行生克模型，不涉及子平八字特有机制：
// 不做天干五合真化/合绊判定，不做墓库锁闭判定，不做三会/三合等地支关系标注与免疫规则。
// 不能直接复用 packages/core/src/bazi/structure.ts 的产出：那份代码会原地改写
// tianGanNodes[].wuxing（五合真化）和 cangGanNodes[].baseScore（三会/三合化神覆盖），
// 常规版明确要求跳过这两步，只能绕开 buildBaziStructure 单独计算。
// 藏干基础分/月令系数/透根分配+封顶逻辑照抄 bazi/energy/energy.ts 的实际代码
// （不是 Mindo-八字.md 文档写的"无上限"——文档与代码在这一点上有漂移，以代码为准）。
// ═══════════════════════════════════════════════════════════════════════════
import type { BaziAnalysis, TianGan, DiZhi, Wuxing, YinYang } from '../types';
import { TIANGAN_WUXING, TIANGAN_YINYANG, DIZHI_CANGGAN, YUELING_COEFF } from '../constants';
import type { ConstitutionEnergyNode } from './types';

interface RawStemNode {
  stem: TianGan;
  wuxing: Wuxing;
  yinyang: YinYang;
}

interface RawBranchNode {
  stem: TianGan;
  wuxing: Wuxing;
  yinyang: YinYang;
  baseScore: number;
}

export function computeRegularEnergyNodes(pillars: BaziAnalysis['pillars']): ConstitutionEnergyNode[] {
  const yuelingWuxing = TIANGAN_WUXING[DIZHI_CANGGAN[pillars.month.branch][0].stem];

  const stems: TianGan[] = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.day.stem,
    ...(pillars.hour ? [pillars.hour.stem] : []),
  ];
  const branches: DiZhi[] = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    ...(pillars.hour ? [pillars.hour.branch] : []),
  ];

  // 天干节点：原始五行，不做五合真化改写
  const tianGanRaw: RawStemNode[] = stems.map(stem => ({
    stem,
    wuxing: TIANGAN_WUXING[stem],
    yinyang: TIANGAN_YINYANG[stem],
  }));

  // 藏干节点：原始baseScore，不做三会/三合覆盖，不做墓库锁闭
  const cangGanRaw: RawBranchNode[] = branches.flatMap(branch =>
    DIZHI_CANGGAN[branch].map(cg => ({
      stem: cg.stem,
      wuxing: TIANGAN_WUXING[cg.stem],
      yinyang: TIANGAN_YINYANG[cg.stem],
      baseScore: cg.score,
    }))
  );

  const nodes: ConstitutionEnergyNode[] = [];

  // 透根：藏干与天干同五行即计入根，coeff=baseScore/10，
  // 按同五行天干数分配、封顶3（照抄 energy.ts:38-42 的实际代码）
  for (const tg of tianGanRaw) {
    const totalTougenCoeff = cangGanRaw
      .filter(cg => cg.wuxing === tg.wuxing)
      .reduce((sum, cg) => sum + cg.baseScore / 10, 0);
    const sameWuxingCount = tianGanRaw.filter(n => n.wuxing === tg.wuxing).length;
    const allocatedCoeff = totalTougenCoeff / sameWuxingCount;
    const cappedCoeff = Math.min(allocatedCoeff, 3);
    const yuelingCoeff = YUELING_COEFF[yuelingWuxing][tg.wuxing];
    const energy = 30 * yuelingCoeff * (1 + cappedCoeff);

    nodes.push({ type: 'TianGan', wuxing: tg.wuxing, yinyang: tg.yinyang, energy });
  }

  for (const cg of cangGanRaw) {
    const yuelingCoeff = YUELING_COEFF[yuelingWuxing][cg.wuxing];
    const energy = cg.baseScore * yuelingCoeff;

    nodes.push({ type: 'CangGan', wuxing: cg.wuxing, yinyang: cg.yinyang, energy });
  }

  return nodes;
}
