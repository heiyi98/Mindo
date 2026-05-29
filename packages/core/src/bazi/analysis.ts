import type {
  Wuxing, TianGan, DiZhi, ShiShen,
  GongWeiPos, CangGanNode, TianGanNode,
  TianGanHe, TianGanChong, DiZhiRelation, TouGenResult,
  TouGenRoot, CangGanVisibility, EnergyNode, ShiShenNode,
  ShiShenInfluenceGroup, BaziAnalysis,
  BaziMeta, BaziSnapshot
} from './types';
import {
  TIANGAN_WUXING, TIANGAN_YINYANG, DIZHI_CANGGAN, MU_KU,
  YUELING_COEFF, TIANGAN_WUHE, TIANGAN_CHONG,
  DIZHI_SANHUI, DIZHI_SANHE, DIZHI_LIUHE, DIZHI_LIUCHONG,
  DIZHI_XING, DIZHI_HAI, DIZHI_PO,
  GONGWEI_WEIGHT, GENERATES, RESTRAINS
} from './constants';
import { calcShiShen, isAdjacent } from './utils';
import { detectPattern } from './pattern';
import { computeWuxingAssessment } from './yongshen';

function getBranchPos(
  branch: DiZhi,
  pillars: BaziAnalysis['pillars']
): GongWeiPos {
  if (pillars.year.branch === branch) return 'YearBranch';
  if (pillars.month.branch === branch) return 'MonthBranch';
  if (pillars.day.branch === branch) return 'DayBranch';
  return 'HourBranch';
}

export function analyzeBazi(pillars: BaziAnalysis['pillars']): BaziAnalysis {

  // ── 月令 ──────────────────────────────────────────────
  const yuelingWuxing: Wuxing =
    TIANGAN_WUXING[DIZHI_CANGGAN[pillars.month.branch][0].stem];

  // ── 初始化天干节点 ─────────────────────────────────────
  const posMap: { pos: GongWeiPos; stem: TianGan }[] = [
    { pos: 'YearStem',  stem: pillars.year.stem  },
    { pos: 'MonthStem', stem: pillars.month.stem },
    { pos: 'DayStem',   stem: pillars.day.stem   },
    ...(pillars.hour ? [{ pos: 'HourStem' as GongWeiPos, stem: pillars.hour.stem }] : []),
  ];

  const tianGanNodes: TianGanNode[] = posMap.map(({ pos, stem }) => ({
    id: `${pos}_${stem}`,
    pos,
    stem,
    wuxing: TIANGAN_WUXING[stem],
    yinyang: TIANGAN_YINYANG[stem],
  }));

  // ── 初始化藏干节点 ─────────────────────────────────────
  const branchPosMap: { pos: GongWeiPos; branch: DiZhi }[] = [
    { pos: 'YearBranch',  branch: pillars.year.branch  },
    { pos: 'MonthBranch', branch: pillars.month.branch },
    { pos: 'DayBranch',   branch: pillars.day.branch   },
    ...(pillars.hour ? [{ pos: 'HourBranch' as GongWeiPos, branch: pillars.hour.branch }] : []),
  ];

  const cangGanNodes: CangGanNode[] = [];
  for (const { pos, branch } of branchPosMap) {
    const cangGanList = DIZHI_CANGGAN[branch];
    if (!cangGanList) continue;
    for (const { stem, qi, score } of cangGanList) {
      cangGanNodes.push({
        id: `${pos}_${stem}_${qi}`,
        branchPos: pos,
        branch,
        stem,
        wuxing: TIANGAN_WUXING[stem],
        yinyang: TIANGAN_YINYANG[stem],
        qi,
        baseScore: score,
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  // 步骤一：地支关系标注（先于五合，供化气条件引用）
  // ═══════════════════════════════════════════════════════
  const diZhiRelations: DiZhiRelation[] = [];
  const branches = [
    pillars.year.branch, pillars.month.branch,
    pillars.day.branch,
    ...(pillars.hour ? [pillars.hour.branch] : []),
  ];
  const branchSet = new Set(branches);

  for (const [b1, b2, b3, sanhuiWuxing] of DIZHI_SANHUI) {
    if (branchSet.has(b1) && branchSet.has(b2) && branchSet.has(b3)) {
      diZhiRelations.push({
        type: 'SanHui',
        branches: [b1, b2, b3],
        positions: [b1, b2, b3].map(b => getBranchPos(b, pillars)),
        wuxing: sanhuiWuxing,
      });
    }
  }

  for (const [changSheng, diWang, mu, sanheWuxing] of DIZHI_SANHE) {
    const hasChangSheng = branchSet.has(changSheng);
    const hasDiWang = branchSet.has(diWang);
    const hasMu = branchSet.has(mu);

    if (hasChangSheng && hasDiWang && hasMu) {
      diZhiRelations.push({
        type: 'SanHe',
        branches: [changSheng, diWang, mu],
        positions: [changSheng, diWang, mu].map(b => getBranchPos(b, pillars)),
        wuxing: sanheWuxing,
      });
    } else if (hasDiWang && (hasChangSheng || hasMu)) {
      const present = [changSheng, diWang, mu].filter(b => branchSet.has(b));
      diZhiRelations.push({
        type: 'BanHe',
        branches: present,
        positions: present.map(b => getBranchPos(b, pillars)),
        note: `帝旺${diWang}在场，${!hasChangSheng ? `缺长生${changSheng}` : `缺墓${mu}`}`,
      });
    } else if (hasChangSheng && hasMu && !hasDiWang) {
      diZhiRelations.push({
        type: 'GongHe',
        branches: [changSheng, mu],
        positions: [changSheng, mu].map(b => getBranchPos(b, pillars)),
        note: `缺帝旺${diWang}，待激活`,
      });
    }
  }

  for (const [b1, b2] of DIZHI_LIUHE) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'LiuHe',
        branches: [b1, b2],
        positions: [b1, b2].map(b => getBranchPos(b, pillars)),
      });
    }
  }

  for (const [b1, b2] of DIZHI_LIUCHONG) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'LiuChong',
        branches: [b1, b2],
        positions: [b1, b2].map(b => getBranchPos(b, pillars)),
      });
    }
  }

  for (const xingGroup of DIZHI_XING) {
    if (xingGroup.every(b => branchSet.has(b as DiZhi))) {
      diZhiRelations.push({
        type: 'Xing',
        branches: xingGroup as DiZhi[],
        positions: (xingGroup as DiZhi[]).map(b => getBranchPos(b, pillars)),
        note: xingGroup.length === 1 ? '自刑' : undefined,
      });
    }
  }

  for (const [b1, b2] of DIZHI_HAI) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'Hai',
        branches: [b1, b2],
        positions: [b1, b2].map(b => getBranchPos(b, pillars)),
      });
    }
  }

  for (const [b1, b2] of DIZHI_PO) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'Po',
        branches: [b1, b2],
        positions: [b1, b2].map(b => getBranchPos(b, pillars)),
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  // 步骤二：天干五合判定（moonHelps 引用地支三合/三会）
  // ═══════════════════════════════════════════════════════
  const tianGanHeResults: TianGanHe[] = [];
  const hebanStemPos = new Set<GongWeiPos>();
  const zhenhuaMap = new Map<GongWeiPos, Wuxing>();

  for (const [s1, s2, huashen] of TIANGAN_WUHE) {
    const node1 = tianGanNodes.find(n => n.stem === s1);
    const node2 = tianGanNodes.find(n => n.stem === s2);
    if (!node1 || !node2) continue;

    const sameAs1 = tianGanNodes.filter(n => n.stem === s1);
    const sameAs2 = tianGanNodes.filter(n => n.stem === s2);
    if (sameAs1.length >= 2 || sameAs2.length >= 2) {
      tianGanHeResults.push({
        stem1: s1, stem1Pos: node1.pos,
        stem2: s2, stem2Pos: node2.pos,
        huashen, result: 'ZhengHe'
      });
      continue;
    }

    const adjacent = isAdjacent(node1.pos, node2.pos);
    const moonHelps = yuelingWuxing === huashen ||
      diZhiRelations.some(r =>
        (r.type === 'SanHui' || r.type === 'SanHe') && r.wuxing === huashen
      );
    const hasClash = tianGanNodes
      .filter(n => n.pos !== node1.pos && n.pos !== node2.pos)
      .some(n => RESTRAINS[n.wuxing] === huashen);

    if (adjacent && moonHelps && !hasClash) {
      tianGanHeResults.push({
        stem1: s1, stem1Pos: node1.pos,
        stem2: s2, stem2Pos: node2.pos,
        huashen, result: 'ZhenHua'
      });
      zhenhuaMap.set(node1.pos, huashen);
      zhenhuaMap.set(node2.pos, huashen);
    } else {
      tianGanHeResults.push({
        stem1: s1, stem1Pos: node1.pos,
        stem2: s2, stem2Pos: node2.pos,
        huashen, result: 'HeBan'
      });
      hebanStemPos.add(node1.pos);
      hebanStemPos.add(node2.pos);
    }
  }

  for (const node of tianGanNodes) {
    if (zhenhuaMap.has(node.pos)) {
      node.wuxing = zhenhuaMap.get(node.pos)!;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 步骤三：天干相冲标注
  // ═══════════════════════════════════════════════════════
  const tianGanChongResults: TianGanChong[] = [];
  for (const [s1, s2] of TIANGAN_CHONG) {
    const node1 = tianGanNodes.find(n => n.stem === s1);
    const node2 = tianGanNodes.find(n => n.stem === s2);
    if (!node1 || !node2) continue;
    tianGanChongResults.push({
      stem1: s1, stem1Pos: node1.pos,
      stem2: s2, stem2Pos: node2.pos,
    });
  }

  // ═══════════════════════════════════════════════════════
  // 步骤四：透根判定
  // ═══════════════════════════════════════════════════════
  const touGenResults: TouGenResult[] = [];
  const cangGanVisibility: CangGanVisibility[] = [];

  const transparentWuxingMap = new Map<Wuxing, GongWeiPos[]>();
  for (const node of tianGanNodes) {
    if (!transparentWuxingMap.has(node.wuxing)) {
      transparentWuxingMap.set(node.wuxing, []);
    }
    transparentWuxingMap.get(node.wuxing)!.push(node.pos);
  }

  for (const stemNode of tianGanNodes) {
    const roots: TouGenRoot[] = [];
    for (const cgNode of cangGanNodes) {
      if (cgNode.wuxing === stemNode.wuxing) {
        const coeff = cgNode.baseScore / 30;
        roots.push({
          branchPos: cgNode.branchPos,
          branch: cgNode.branch,
          cangganId: cgNode.id,
          cangganStem: cgNode.stem,
          qi: cgNode.qi,
          baseScore: cgNode.baseScore,
          tougenCoeff: coeff,
        });
      }
    }
    const totalCoeff = roots.reduce((sum, r) => sum + r.tougenCoeff, 0);
    touGenResults.push({
      stemPos: stemNode.pos,
      stem: stemNode.stem,
      wuxing: stemNode.wuxing,
      roots,
      totalTougenCoeff: totalCoeff,
      tag: roots.length > 0 ? 'TongGen' : 'Lu',
    });
  }

  for (const cgNode of cangGanNodes) {
    const isMuKu = MU_KU.includes(cgNode.branch);
    const hasTransparent = transparentWuxingMap.has(cgNode.wuxing);
    const isMuKuLocked = isMuKu && !hasTransparent;

    cangGanVisibility.push({
      cangganId: cgNode.id,
      branchPos: cgNode.branchPos,
      stem: cgNode.stem,
      qi: cgNode.qi,
      tag: hasTransparent ? 'TouChu' : 'Cang',
      isMuKuLocked,
    });
  }

  // ═══════════════════════════════════════════════════════
  // 步骤五：独立能量计算
  // 天干：有根×3，无根×1；藏干：透出×3，未透×1
  // tougenCoeff 保留写入，仅作参考，不参与能量计算
  // ═══════════════════════════════════════════════════════
  const energyNodes: EnergyNode[] = [];

  for (const stemNode of tianGanNodes) {
    const tougenResult = touGenResults.find(t => t.stemPos === stemNode.pos);
    const totalTougenCoeff = tougenResult?.totalTougenCoeff ?? 0;
    const yuelingCoeff = YUELING_COEFF[yuelingWuxing][stemNode.wuxing];
    const hasRoot = (tougenResult?.roots.length ?? 0) > 0;
    const energy = 30 * yuelingCoeff * (hasRoot ? 3 : 1);

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
    const isTransparent = visibility?.tag === 'TouChu';
    const energy = cgNode.baseScore * yuelingCoeff * (isTransparent ? 3 : 1);

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
  // 步骤六：十神挂载
  // ═══════════════════════════════════════════════════════
  const dayMasterNode = tianGanNodes.find(n => n.pos === 'DayStem')!;
  const dayMasterWuxing = dayMasterNode.wuxing;
  const dayMasterYinYang = dayMasterNode.yinyang;

  const shishenMap: ShiShenNode[] = energyNodes.map(node => {
    if (node.pos === 'DayStem' && node.type === 'TianGan') {
      return { id: node.id, shishen: 'DayMaster' };
    }
    return {
      id: node.id,
      shishen: calcShiShen(
        dayMasterWuxing, dayMasterYinYang,
        node.wuxing, node.yinyang
      )
    };
  });

  // ═══════════════════════════════════════════════════════
  // 步骤七：十神影响力总值
  // ═══════════════════════════════════════════════════════
  const shishenGroups = new Map<ShiShen, ShiShenInfluenceGroup['nodes']>();
  let dayMasterEnergy = 0;

  for (const node of energyNodes) {
    if (node.pos === 'DayStem' && node.type === 'TianGan') {
      dayMasterEnergy = node.energy;
      continue;
    }
    if (!node.outputEnabled) continue;

    const weight = GONGWEI_WEIGHT[node.pos];
    const influence = node.energy * weight;
    const ssNode = shishenMap.find(s => s.id === node.id);
    if (!ssNode) continue;

    const ss = ssNode.shishen;
    if (!shishenGroups.has(ss)) shishenGroups.set(ss, []);
    shishenGroups.get(ss)!.push({
      id: node.id,
      energy: node.energy,
      weight,
      influence,
    });
  }

  const shishenInfluence: ShiShenInfluenceGroup[] = [];
  for (const [shishen, nodes] of shishenGroups) {
    shishenInfluence.push({
      shishen,
      nodes,
      totalInfluence: nodes.reduce((sum, n) => sum + n.influence, 0),
    });
  }

  const result: BaziAnalysis = {
    pillars,
    yuelingWuxing,
    tianGanNodes,
    cangGanNodes,
    tianGanHeResults,
    tianGanChongResults,
    diZhiRelations,
    touGenResults,
    cangGanVisibility,
    energyNodes,
    shishenMap,
    shishenInfluence,
    dayMasterEnergy,
  };
  result.pattern = detectPattern(result);
  return result;
}

export function toBaziSnapshot(
  analysis: BaziAnalysis,
  meta: BaziMeta,
  energyScores: Record<Wuxing, number>
): BaziSnapshot {
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
    relations: {
      tianGanHe:      analysis.tianGanHeResults,
      tianGanChong:   analysis.tianGanChongResults,
      diZhiRelations: analysis.diZhiRelations,
    },
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
      dayStem:   analysis.pillars.day.stem,
      influence: {
        shishenInfluence: analysis.shishenInfluence,
        dayMasterEnergy:  analysis.dayMasterEnergy,
      },
    }),
  };
}
