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
  GENERATES, RESTRAINS
} from './constants';
import { calcShiShen, isAdjacent } from './utils';
import { detectPattern } from './pattern';
import { computeWuxingAssessment } from './yongshen';

function getAllBranchPos(
  branch: DiZhi,
  branchPosMap: { pos: GongWeiPos; branch: DiZhi }[]
): GongWeiPos[] {
  // 地支可能在多个宫位出现（如午在年支和月支同时出现）
  // 返回所有匹配宫位，避免重复地支只映射到第一个宫位的 bug
  return branchPosMap.filter(e => e.branch === branch).map(e => e.pos);
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
  let diZhiRelations: DiZhiRelation[] = [];
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
        positions: [b1, b2, b3].flatMap(b => getAllBranchPos(b, branchPosMap)),
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
        positions: [changSheng, diWang, mu].flatMap(b => getAllBranchPos(b, branchPosMap)),
        wuxing: sanheWuxing,
      });
    } else if (hasDiWang && (hasChangSheng || hasMu)) {
      const present = [changSheng, diWang, mu].filter(b => branchSet.has(b));
      diZhiRelations.push({
        type: 'BanHe',
        branches: present,
        positions: present.flatMap(b => getAllBranchPos(b, branchPosMap)),
        note: `帝旺${diWang}在场，${!hasChangSheng ? `缺长生${changSheng}` : `缺墓${mu}`}`,
      });
    } else if (hasChangSheng && hasMu && !hasDiWang) {
      diZhiRelations.push({
        type: 'GongHe',
        branches: [changSheng, mu],
        positions: [changSheng, mu].flatMap(b => getAllBranchPos(b, branchPosMap)),
        note: `缺帝旺${diWang}，待激活`,
      });
    }
  }

  for (const [b1, b2] of DIZHI_LIUHE) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'LiuHe',
        branches: [b1, b2],
        positions: [b1, b2].flatMap(b => getAllBranchPos(b, branchPosMap)),
      });
    }
  }

  for (const [b1, b2] of DIZHI_LIUCHONG) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'LiuChong',
        branches: [b1, b2],
        positions: [b1, b2].flatMap(b => getAllBranchPos(b, branchPosMap)),
      });
    }
  }

  for (const xingGroup of DIZHI_XING) {
    if (xingGroup.length === 1) {
      // 自刑（辰午酉亥）：同一地支在四柱中出现 ≥2 次才标记
      const b = xingGroup[0] as DiZhi;
      const matched = branchPosMap.filter(e => e.branch === b).map(e => e.pos);
      if (matched.length >= 2) {
        diZhiRelations.push({
          type: 'Xing',
          branches: matched.map(() => b),
          positions: matched,
          note: '自刑',
        });
      }
    } else if (xingGroup.every(b => branchSet.has(b as DiZhi))) {
      diZhiRelations.push({
        type: 'Xing',
        branches: xingGroup as DiZhi[],
        positions: (xingGroup as DiZhi[]).flatMap(b => getAllBranchPos(b, branchPosMap)),
      });
    }
  }

  for (const [b1, b2] of DIZHI_HAI) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'Hai',
        branches: [b1, b2],
        positions: [b1, b2].flatMap(b => getAllBranchPos(b, branchPosMap)),
      });
    }
  }

  for (const [b1, b2] of DIZHI_PO) {
    if (branchSet.has(b1) && branchSet.has(b2)) {
      diZhiRelations.push({
        type: 'Po',
        branches: [b1, b2],
        positions: [b1, b2].flatMap(b => getAllBranchPos(b, branchPosMap)),
      });
    }
  }

  // 合解冲：三合/六合参与支免疫六冲标签
  // 依据：优先级 会合冲刑破害，有合则冲被化解
  const protectedByHe = new Set<DiZhi>();
  for (const r of diZhiRelations) {
    if (r.type === 'SanHe' || r.type === 'LiuHe') {
      r.branches.forEach(b => protectedByHe.add(b));
    }
  }
  diZhiRelations = diZhiRelations.filter(r =>
    r.type !== 'LiuChong' ||
    !r.branches.some(b => protectedByHe.has(b))
  );

  // 三会/三合：化神藏干 baseScore→30，其余→0
  // 依据：地支属性不变，但会局气势使化神完全压制其他气
  // 三会优先于三合（遍历时 SanHui 在前，用 Map 保证先到先得）
  const branchHuashen = new Map<DiZhi, Wuxing>();
  for (const r of diZhiRelations) {
    if ((r.type === 'SanHui' || r.type === 'SanHe') && r.wuxing) {
      for (const branch of r.branches) {
        if (!branchHuashen.has(branch)) branchHuashen.set(branch, r.wuxing);
      }
    }
  }
  for (const cgNode of cangGanNodes) {
    const huashen = branchHuashen.get(cgNode.branch);
    if (huashen !== undefined) {
      cgNode.baseScore = TIANGAN_WUXING[cgNode.stem] === huashen ? 30 : 0;
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
      // 墓库被六冲则开库，已开库的藏干可作为通根来源
      if (MU_KU.includes(cgNode.branch)) {
        const isChonged = diZhiRelations.some(r =>
          r.type === 'LiuChong' && r.branches.includes(cgNode.branch)
        );
        if (!isChonged) continue;
      }
      if (cgNode.wuxing === stemNode.wuxing) {
        const coeff = cgNode.baseScore / 10; // 通根系数 = 藏干基础分÷10，来自"一专气根胜三比肩"口诀推导
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
    // 墓库被六冲则开库（辰戌互冲、丑未互冲）
    // 依据：冲开墓库，藏干能量得以释放
    const isChonged = isMuKu && diZhiRelations.some(r =>
      r.type === 'LiuChong' && r.branches.includes(cgNode.branch)
    );
    const isMuKuLocked = isMuKu && !isChonged;
    const hasTransparent = !isMuKuLocked && transparentWuxingMap.has(cgNode.wuxing);

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
  // 天干：energy = 30 × 月令系数 × (1 + 分配通根系数)，分配通根系数 = totalTougenCoeff / 同五行天干数，上限3
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

    const influence = node.energy;
    const ssNode = shishenMap.find(s => s.id === node.id);
    if (!ssNode) continue;

    const ss = ssNode.shishen;
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
