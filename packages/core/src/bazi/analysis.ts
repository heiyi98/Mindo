import type {
  Wuxing, TianGan, DiZhi, ShiShen, QiWei, YinYang,
  GongWeiPos, CangGanNode, TianGanNode,
  TianGanHe, TianGanChong, DiZhiRelation, TouGenResult,
  TouGenRoot, CangGanVisibility, EnergyNode, ShiShenNode,
  ShiShenInfluenceGroup, BaziAnalysis,
  BaziMeta, BaziSnapshot
} from './types';

// ═══════════════════════════════════════════════════════
// 静态数据表
// ═══════════════════════════════════════════════════════

const TIANGAN_WUXING: Record<TianGan, Wuxing> = {
  Jia: 'Wood', Yi: 'Wood',
  Bing: 'Fire', Ding: 'Fire',
  Wu: 'Earth', Ji: 'Earth',
  Geng: 'Metal', Xin: 'Metal',
  Ren: 'Water', Gui: 'Water'
};

const TIANGAN_YINYANG: Record<TianGan, YinYang> = {
  Jia: 'Yang', Yi: 'Yin',
  Bing: 'Yang', Ding: 'Yin',
  Wu: 'Yang', Ji: 'Yin',
  Geng: 'Yang', Xin: 'Yin',
  Ren: 'Yang', Gui: 'Yin'
};

const DIZHI_CANGGAN: Record<DiZhi, { stem: TianGan; qi: QiWei; score: number }[]> = {
  Zi:   [{ stem: 'Gui',  qi: 'BenQi',   score: 30 }],
  Chou: [{ stem: 'Ji',   qi: 'BenQi',   score: 18 },
         { stem: 'Gui',  qi: 'ZhongQi', score: 9  },
         { stem: 'Xin',  qi: 'YuQi',    score: 3  }],
  Yin:  [{ stem: 'Jia',  qi: 'BenQi',   score: 16 },
         { stem: 'Bing', qi: 'ZhongQi', score: 7  },
         { stem: 'Wu',   qi: 'YuQi',    score: 7  }],
  Mao:  [{ stem: 'Yi',   qi: 'BenQi',   score: 30 }],
  Chen: [{ stem: 'Wu',   qi: 'BenQi',   score: 18 },
         { stem: 'Yi',   qi: 'ZhongQi', score: 9  },
         { stem: 'Gui',  qi: 'YuQi',    score: 3  }],
  Si:   [{ stem: 'Bing', qi: 'BenQi',   score: 16 },
         { stem: 'Geng', qi: 'ZhongQi', score: 7  },
         { stem: 'Wu',   qi: 'YuQi',    score: 7  }],
  Wu:   [{ stem: 'Ding', qi: 'BenQi',   score: 21 },
         { stem: 'Ji',   qi: 'ZhongQi', score: 9  }],
  Wei:  [{ stem: 'Ji',   qi: 'BenQi',   score: 18 },
         { stem: 'Ding', qi: 'ZhongQi', score: 9  },
         { stem: 'Yi',   qi: 'YuQi',    score: 3  }],
  Shen: [{ stem: 'Geng', qi: 'BenQi',   score: 16 },
         { stem: 'Ren',  qi: 'ZhongQi', score: 7  },
         { stem: 'Wu',   qi: 'YuQi',    score: 7  }],
  You:  [{ stem: 'Xin',  qi: 'BenQi',   score: 30 }],
  Xu:   [{ stem: 'Wu',   qi: 'BenQi',   score: 18 },
         { stem: 'Xin',  qi: 'ZhongQi', score: 9  },
         { stem: 'Ding', qi: 'YuQi',    score: 3  }],
  Hai:  [{ stem: 'Ren',  qi: 'BenQi',   score: 21 },
         { stem: 'Jia',  qi: 'ZhongQi', score: 9  }]
};

const MU_KU: DiZhi[] = ['Chen', 'Xu', 'Chou', 'Wei'];

const YUELING_COEFF: Record<Wuxing, Record<Wuxing, number>> = {
  Wood:  { Wood: 2.0,  Fire: 1.33, Earth: 0.67, Metal: 0.33, Water: 0.83 },
  Fire:  { Fire: 2.0,  Earth: 1.33, Metal: 0.67, Water: 0.33, Wood: 0.83 },
  Earth: { Earth: 2.0, Metal: 1.33, Water: 0.67, Wood: 0.33,  Fire: 0.83 },
  Metal: { Metal: 2.0, Water: 1.33, Wood: 0.67,  Fire: 0.33,  Earth: 0.83 },
  Water: { Water: 2.0, Wood: 1.33,  Fire: 0.67,  Earth: 0.33, Metal: 0.83 }
};

const TIANGAN_WUHE: [TianGan, TianGan, Wuxing][] = [
  ['Jia', 'Ji',   'Earth'],
  ['Yi',  'Geng', 'Metal'],
  ['Bing','Xin',  'Water'],
  ['Ding','Ren',  'Wood'],
  ['Wu',  'Gui',  'Fire']
];

const TIANGAN_CHONG: [TianGan, TianGan][] = [
  ['Jia', 'Geng'],
  ['Yi',  'Xin'],
  ['Bing','Ren'],
  ['Ding','Gui']
];

const DIZHI_SANHUI: [DiZhi, DiZhi, DiZhi, Wuxing][] = [
  ['Yin', 'Mao', 'Chen', 'Wood'],
  ['Si',  'Wu',  'Wei',  'Fire'],
  ['Shen','You', 'Xu',   'Metal'],
  ['Hai', 'Zi',  'Chou', 'Water']
];

const DIZHI_SANHE: [DiZhi, DiZhi, DiZhi, Wuxing][] = [
  ['Hai', 'Mao', 'Wei',  'Wood'],
  ['Yin', 'Wu',  'Xu',   'Fire'],
  ['Si',  'You', 'Chou', 'Metal'],
  ['Shen','Zi',  'Chen', 'Water']
];

const DIZHI_LIUHE: [DiZhi, DiZhi][] = [
  ['Zi','Chou'], ['Yin','Hai'], ['Mao','Xu'],
  ['Chen','You'], ['Si','Shen'], ['Wu','Wei']
];

const DIZHI_LIUCHONG: [DiZhi, DiZhi][] = [
  ['Zi','Wu'], ['Chou','Wei'], ['Yin','Shen'],
  ['Mao','You'], ['Chen','Xu'], ['Si','Hai']
];

const DIZHI_XING: DiZhi[][] = [
  ['Yin', 'Si', 'Shen'],
  ['Chou', 'Xu', 'Wei'],
  ['Zi', 'Mao'],
  ['Chen'],
  ['Wu'],
  ['You'],
  ['Hai']
];

const DIZHI_HAI: [DiZhi, DiZhi][] = [
  ['Zi','Wei'], ['Chou','Wu'], ['Yin','Si'],
  ['Mao','Chen'], ['Shen','Hai'], ['You','Xu']
];

const DIZHI_PO: [DiZhi, DiZhi][] = [
  ['Zi','You'], ['Chou','Chen'], ['Yin','Hai'],
  ['Mao','Wu'], ['Si','Shen'], ['Wei','Xu']
];

// 宫位权重（勾股定理，日干坐标(1,3)为原点）
const GONGWEI_WEIGHT: Record<GongWeiPos, number> = {
  YearStem:    1 / Math.sqrt(4),
  YearBranch:  1 / Math.sqrt(5),
  MonthStem:   1 / Math.sqrt(1),
  MonthBranch: 1 / Math.sqrt(2),
  DayStem:     1,
  DayBranch:   1 / Math.sqrt(1),
  HourStem:    1 / Math.sqrt(1),
  HourBranch:  1 / Math.sqrt(2),
};

const GENERATES: Record<Wuxing, Wuxing> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood'
};
const RESTRAINS: Record<Wuxing, Wuxing> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood'
};

// ═══════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════

function isAdjacent(pos1: GongWeiPos, pos2: GongWeiPos): boolean {
  const stemOrder = ['YearStem', 'MonthStem', 'DayStem', 'HourStem'];
  const i1 = stemOrder.indexOf(pos1);
  const i2 = stemOrder.indexOf(pos2);
  if (i1 === -1 || i2 === -1) return false;
  return Math.abs(i1 - i2) === 1;
}

function getBranchPos(
  branch: DiZhi,
  pillars: BaziAnalysis['pillars']
): GongWeiPos {
  if (pillars.year.branch === branch) return 'YearBranch';
  if (pillars.month.branch === branch) return 'MonthBranch';
  if (pillars.day.branch === branch) return 'DayBranch';
  return 'HourBranch';
}

function calcShiShen(
  dayMasterWuxing: Wuxing,
  dayMasterYinYang: YinYang,
  targetWuxing: Wuxing,
  targetYinYang: YinYang
): ShiShen {
  const isSameYinYang = dayMasterYinYang === targetYinYang;

  if (targetWuxing === dayMasterWuxing) {
    return isSameYinYang ? 'BiJian' : 'JieCai';
  }
  if (GENERATES[dayMasterWuxing] === targetWuxing) {
    return isSameYinYang ? 'ShiShen' : 'ShangGuan';
  }
  if (RESTRAINS[dayMasterWuxing] === targetWuxing) {
    return isSameYinYang ? 'PianCai' : 'ZhengCai';
  }
  if (RESTRAINS[targetWuxing] === dayMasterWuxing) {
    return isSameYinYang ? 'QiSha' : 'ZhengGuan';
  }
  if (GENERATES[targetWuxing] === dayMasterWuxing) {
    return isSameYinYang ? 'PianYin' : 'ZhengYin';
  }
  return 'BiJian';
}

// ═══════════════════════════════════════════════════════
// 主分析函数
// ═══════════════════════════════════════════════════════

export function analyzeBazi(pillars: BaziAnalysis['pillars']): BaziAnalysis {

  // ── 月令 ──────────────────────────────────────────────
  const yuelingWuxing: Wuxing =
    TIANGAN_WUXING[DIZHI_CANGGAN[pillars.month.branch][0].stem];

  // ── 初始化天干节点 ─────────────────────────────────────
  const posMap: { pos: GongWeiPos; stem: TianGan }[] = [
    { pos: 'YearStem',  stem: pillars.year.stem  },
    { pos: 'MonthStem', stem: pillars.month.stem },
    { pos: 'DayStem',   stem: pillars.day.stem   },
    { pos: 'HourStem',  stem: pillars.hour.stem  },
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
    { pos: 'HourBranch',  branch: pillars.hour.branch  },
  ];

  const cangGanNodes: CangGanNode[] = [];
  for (const { pos, branch } of branchPosMap) {
    for (const { stem, qi, score } of DIZHI_CANGGAN[branch]) {
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
  // 步骤一：天干五合判定
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
                      GENERATES[yuelingWuxing] === huashen;
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
  // 步骤二：天干相冲标注
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
  // 步骤三：地支关系标注
  // ═══════════════════════════════════════════════════════
  const diZhiRelations: DiZhiRelation[] = [];
  const branches = [
    pillars.year.branch, pillars.month.branch,
    pillars.day.branch, pillars.hour.branch
  ];
  const branchSet = new Set(branches);

  for (const [b1, b2, b3] of DIZHI_SANHUI) {
    if (branchSet.has(b1) && branchSet.has(b2) && branchSet.has(b3)) {
      diZhiRelations.push({
        type: 'SanHui',
        branches: [b1, b2, b3],
        positions: [b1, b2, b3].map(b => getBranchPos(b, pillars)),
      });
    }
  }

  for (const [changSheng, diWang, mu] of DIZHI_SANHE) {
    const hasChangSheng = branchSet.has(changSheng);
    const hasDiWang = branchSet.has(diWang);
    const hasMu = branchSet.has(mu);

    if (hasChangSheng && hasDiWang && hasMu) {
      diZhiRelations.push({
        type: 'SanHe',
        branches: [changSheng, diWang, mu],
        positions: [changSheng, diWang, mu].map(b => getBranchPos(b, pillars)),
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
      tag: roots.length > 0 ? 'TouChu' : 'Lu',
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
  // ═══════════════════════════════════════════════════════
  const energyNodes: EnergyNode[] = [];

  for (const stemNode of tianGanNodes) {
    const tougen = touGenResults.find(t => t.stemPos === stemNode.pos);
    const totalTougenCoeff = tougen?.totalTougenCoeff ?? 0;
    const yuelingCoeff = YUELING_COEFF[yuelingWuxing][stemNode.wuxing];
    const energy = 30 * yuelingCoeff * (1 + totalTougenCoeff);

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
    const energy = cgNode.baseScore * yuelingCoeff;

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

  return {
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
    dayStem:      analysis.pillars.day.stem,
    energyScores,
  };
}
