// ═══════════════════════════════════════════════════════════════════════════
// 公有方法论层——古法八字排盘规则（月令/地支关系/天干合冲/透根/十神/格局）
// 本文件只做分类判断（a情况=b结果），不含任何数值计算/强度量化。
// 禁止在本文件内 import ./energy/ 目录下的任何内容。
// ═══════════════════════════════════════════════════════════════════════════
import type {
  Wuxing, TianGan, DiZhi, ShiShen, YinYang,
  GongWeiPos, CangGanNode, TianGanNode,
  TianGanHe, TianGanChong, DiZhiRelation, TouGenResult,
  TouGenRoot, CangGanVisibility, ShiShenNode,
  BaziAnalysis, PatternResult,
} from './types';
import {
  TIANGAN_WUXING, TIANGAN_YINYANG, DIZHI_CANGGAN, MU_KU,
  TIANGAN_WUHE, TIANGAN_CHONG,
  DIZHI_SANHUI, DIZHI_SANHE, DIZHI_LIUHE, DIZHI_LIUCHONG,
  DIZHI_XING, DIZHI_HAI, DIZHI_PO,
  RESTRAINS,
} from './constants';
import { calcShiShen, isAdjacent } from './utils';

function getAllBranchPos(
  branch: DiZhi,
  branchPosMap: { pos: GongWeiPos; branch: DiZhi }[]
): GongWeiPos[] {
  // 地支可能在多个宫位出现（如午在年支和月支同时出现）
  // 返回所有匹配宫位，避免重复地支只映射到第一个宫位的 bug
  return branchPosMap.filter(e => e.branch === branch).map(e => e.pos);
}

// ── 结构层输出：给 analysis.ts 组装、给 energy/ 层消费用 ──────────────────
export interface BaziStructure {
  pillars: BaziAnalysis['pillars'];
  yuelingWuxing: Wuxing;
  tianGanNodes: TianGanNode[];
  cangGanNodes: CangGanNode[];
  tianGanHeResults: TianGanHe[];
  tianGanChongResults: TianGanChong[];
  diZhiRelations: DiZhiRelation[];
  touGenResults: TouGenResult[];
  cangGanVisibility: CangGanVisibility[];
  shishenMap: ShiShenNode[];
  pattern: PatternResult;
}

export function buildBaziStructure(pillars: BaziAnalysis['pillars']): BaziStructure {

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
  // 透根系数（baseScore÷10）判定为公有方法论——是把传统藏干比例数据
  // 直接做单位换算（1比肩=1单位），不涉及链式反应/强弱分级等专利方法论
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
  // 步骤五：十神挂载
  // 不依赖能量计算——只用日主阴阳五行 vs 各节点阴阳五行做分类比对，
  // 直接遍历天干+藏干节点（不再等 energy 层产出的 energyNodes）
  // ═══════════════════════════════════════════════════════
  const dayMasterNode = tianGanNodes.find(n => n.pos === 'DayStem')!;
  const dayMasterWuxing = dayMasterNode.wuxing;
  const dayMasterYinYang = dayMasterNode.yinyang;

  const shishenMap: ShiShenNode[] = [
    ...tianGanNodes.map(node => ({
      id: node.id,
      shishen: node.pos === 'DayStem'
        ? ('DayMaster' as ShiShen)
        : calcShiShen(dayMasterWuxing, dayMasterYinYang, node.wuxing, node.yinyang),
    })),
    ...cangGanNodes.map(node => ({
      id: node.id,
      shishen: calcShiShen(dayMasterWuxing, dayMasterYinYang, node.wuxing, node.yinyang),
    })),
  ];

  // ═══════════════════════════════════════════════════════
  // 格局判定（原 pattern.ts，合并进本文件）
  // ═══════════════════════════════════════════════════════
  const pattern = detectPattern({
    pillars, tianGanNodes, cangGanNodes,
    tianGanHeResults, diZhiRelations, shishenMap,
  });

  return {
    pillars, yuelingWuxing, tianGanNodes, cangGanNodes,
    tianGanHeResults, tianGanChongResults, diZhiRelations,
    touGenResults, cangGanVisibility, shishenMap, pattern,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 格局判定
// ═══════════════════════════════════════════════════════════════════════════

const ZHUANWANG_NAME: Record<Wuxing, string> = {
  Wood: '曲直格', Fire: '炎上格', Earth: '稼穑格',
  Metal: '从革格', Water: '润下格',
};

const SHISHEN_PATTERN_NAME: Record<ShiShen, string> = {
  BiJian:    '比肩格', JieCai:    '劫财格',
  ZhengGuan: '正官格', QiSha:     '七杀格',
  ZhengYin:  '正印格', PianYin:   '偏印格',
  ZhengCai:  '正财格', PianCai:   '偏财格',
  ShiShen:   '食神格', ShangGuan: '伤官格',
  DayMaster: '日主格',
};

// 用 Yang 求关系类别，阴阳不改变食伤/财/官/印/比劫的大类
function wxCategory(dmWx: Wuxing, dmYy: YinYang, tgtWx: Wuxing): string {
  const ss = calcShiShen(dmWx, dmYy, tgtWx, 'Yang');
  if (ss === 'ShiShen'  || ss === 'ShangGuan') return 'shishen';
  if (ss === 'PianCai'  || ss === 'ZhengCai')  return 'cai';
  if (ss === 'QiSha'    || ss === 'ZhengGuan') return 'guan';
  if (ss === 'PianYin'  || ss === 'ZhengYin')  return 'yin';
  return 'same'; // BiJian / JieCai / DayMaster
}

// 入参类型显式收窄——只包含分类字段，物理上不可能传入 energyNodes 等数值字段
interface PatternInput {
  pillars: BaziAnalysis['pillars'];
  tianGanNodes: TianGanNode[];
  cangGanNodes: CangGanNode[];
  tianGanHeResults: TianGanHe[];
  diZhiRelations: DiZhiRelation[];
  shishenMap: ShiShenNode[];
}

function detectPattern(input: PatternInput): PatternResult {
  const { pillars, tianGanNodes, cangGanNodes, tianGanHeResults, diZhiRelations, shishenMap } = input;

  const dmNode = tianGanNodes.find(n => n.pos === 'DayStem')!;
  const dmWx   = dmNode.wuxing;
  const dmYy   = dmNode.yinyang;

  // ── 化气格 ──────────────────────────────────────────────────────────
  if (tianGanHeResults.some(r =>
    r.result === 'ZhenHua' &&
    (r.stem1Pos === 'DayStem' || r.stem2Pos === 'DayStem')
  )) {
    return { category: 'huaqi', name: '化气格' };
  }

  // ── 专旺格 条件A（木/火/金/水）──────────────────────────────────────
  if (dmWx !== 'Earth') {
    const hasFormation = diZhiRelations.some(r =>
      (r.type === 'SanHui' || r.type === 'SanHe') && r.wuxing === dmWx
    );
    const noEnemy = !shishenMap.some(n =>
      n.shishen === 'QiSha' || n.shishen === 'ZhengGuan'
    );
    if (hasFormation && noEnemy) {
      return { category: 'zhuanwang', name: ZHUANWANG_NAME[dmWx] };
    }
  }

  // ── 专旺格 条件B（稼穑格，Earth）────────────────────────────────────
  if (dmWx === 'Earth') {
    const earthBranches = ['Chen', 'Xu', 'Chou', 'Wei'];
    const allBranches = [
      pillars.year.branch, pillars.month.branch, pillars.day.branch,
      ...(pillars.hour ? [pillars.hour.branch] : []),
    ];
    // 注：此处原先误查 energyNodes（专利层产物），已改查 tianGanNodes/
    // cangGanNodes（结构层原始数据），只判断"有没有木"，不触碰任何数值
    const hasNoWood =
      !tianGanNodes.some(n => n.wuxing === 'Wood') &&
      !cangGanNodes.some(n => n.wuxing === 'Wood');
    if (allBranches.every(b => earthBranches.includes(b)) && hasNoWood) {
      return { category: 'zhuanwang', name: '稼穑格' };
    }
  }

  // ── 从儿格 / 从财格 / 从杀格 ────────────────────────────────────────
  const noCongForbidden = !shishenMap.some(n =>
    n.shishen === 'PianYin' || n.shishen === 'ZhengYin' ||
    n.shishen === 'BiJian'  || n.shishen === 'JieCai'
  );
  if (noCongForbidden) {
    for (const r of diZhiRelations) {
      if ((r.type === 'SanHui' || r.type === 'SanHe') && r.wuxing) {
        const cat = wxCategory(dmWx, dmYy, r.wuxing);
        if (cat === 'shishen') return { category: 'cong', name: '从儿格' };
        if (cat === 'cai')     return { category: 'cong', name: '从财格' };
        if (cat === 'guan')    return { category: 'cong', name: '从杀格' };
        break; // 只取第一个三会/三合
      }
    }
  }

  // ── 从强格 ──────────────────────────────────────────────────────────
  const monthMainStem = DIZHI_CANGGAN[pillars.month.branch][0].stem;
  const monthMainWx   = TIANGAN_WUXING[monthMainStem];
  const monthMainYy   = TIANGAN_YINYANG[monthMainStem];
  const monthMainSs   = calcShiShen(dmWx, dmYy, monthMainWx, monthMainYy);
  if (
    (monthMainSs === 'PianYin' || monthMainSs === 'ZhengYin') &&
    diZhiRelations.some(r =>
      (r.type === 'SanHui' || r.type === 'SanHe') && r.wuxing === monthMainWx
    ) &&
    !shishenMap.some(n => n.shishen === 'PianCai' || n.shishen === 'ZhengCai')
  ) {
    return { category: 'cong', name: '从强格' };
  }

  // ── 正格 ─────────────────────────────────────────────────────────────
  // 透干扫描：取月支藏干中最高优先级透出者（本气>中气>余气），无透则兜底本气
  const nonDayStems = new Set<string>(
    tianGanNodes.filter(n => n.pos !== 'DayStem').map(n => n.stem)
  );
  const monthCangGan = DIZHI_CANGGAN[pillars.month.branch];

  let selectedStem = monthCangGan[0].stem; // 兜底：本气
  for (const cg of monthCangGan) {        // 顺序：BenQi → ZhongQi → YuQi
    if (nonDayStems.has(cg.stem)) {
      selectedStem = cg.stem;
      break;
    }
  }

  const selectedWx = TIANGAN_WUXING[selectedStem];
  const selectedYy = TIANGAN_YINYANG[selectedStem];
  const selectedSs = calcShiShen(dmWx, dmYy, selectedWx, selectedYy);

  return { category: 'normal', name: SHISHEN_PATTERN_NAME[selectedSs] };
}

export { detectPattern };
