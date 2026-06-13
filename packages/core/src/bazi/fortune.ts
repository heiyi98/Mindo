import { Solar } from 'lunar-typescript';
import type { BaziSnapshot, TianGan, DiZhi, Wuxing, YinYang, QiWei } from './types';
import {
  TIANGAN_WUXING, TIANGAN_YINYANG, DIZHI_CANGGAN, MU_KU,
  YUELING_COEFF, TIANGAN_WUHE,
  DIZHI_SANHUI, DIZHI_SANHE, DIZHI_LIUHE, DIZHI_LIUCHONG,
  DIZHI_XING, DIZHI_HAI, DIZHI_PO,
  RESTRAINS,
} from './constants';
import { calcShiShen, isAdjacent } from './utils';
import { STEM_MAP, BRANCH_MAP } from './engine';
import type { DestinyTimeline } from './timeline';

// ── 流月/流日干支获取（供 API 层调用，封装 lunar-typescript 依赖）──

export function getMonthPillar(year: number, month: number): LinPillar {
  // 取每月15日正午作为月令锚定点，保证月支稳定
  const ec = Solar.fromYmdHms(year, month, 15, 12, 0, 0).getLunar().getEightChar();
  return {
    stem: STEM_MAP[ec.getMonthGan()] as TianGan,
    branch: BRANCH_MAP[ec.getMonthZhi()] as DiZhi,
  };
}

export function getDayPillar(year: number, month: number, day: number): LinPillar {
  const ec = Solar.fromYmdHms(year, month, day, 12, 0, 0).getLunar().getEightChar();
  return {
    stem: STEM_MAP[ec.getDayGan()] as TianGan,
    branch: BRANCH_MAP[ec.getDayZhi()] as DiZhi,
  };
}

export interface LinPillar {
  stem: TianGan;
  branch: DiZhi;
}

export interface FortuneGroupEnergies {
  bijie: number;    // 比劫
  shishang: number; // 食伤
  caixin: number;   // 财星
  guansha: number;  // 官杀
  yinxing: number;  // 印星
}

export interface FortuneResult {
  imbalance: number;
  energies: FortuneGroupEnergies;
}

export interface MonthScore {
  month: number;
  liuyueStem: TianGan;
  liuyueBranch: DiZhi;
  imbalance: number;
  energies: FortuneGroupEnergies;
}

export interface YearScore {
  year: number;
  age: number;
  dayunStem: TianGan;
  dayunBranch: DiZhi;
  liuyearStem: TianGan;
  liuyearBranch: DiZhi;
  imbalance: number;
  energies: FortuneGroupEnergies;
  months: MonthScore[];
}

export interface LifeChartData {
  baseline: number;
  baselineEnergies: FortuneGroupEnergies;
  years: YearScore[];
}

// ── 内部类型 ──────────────────────────────────────────────

interface BranchRel {
  type: 'SanHui' | 'SanHe' | 'BanHe' | 'GongHe' | 'LiuHe' | 'LiuChong' | 'Xing' | 'Hai' | 'Po';
  branches: DiZhi[];
  wuxing?: Wuxing;
}

interface StemNode {
  stem: TianGan;
  wuxing: Wuxing; // 可被真化改写
  yinyang: YinYang;
  isLin: boolean;
  linIdx?: number;
  natalIdx?: number; // 0=年干 1=月干 2=日干 3=时干
  isDayStem: boolean;
}

interface CgNode {
  branch: DiZhi;
  stem: TianGan;
  wuxing: Wuxing;
  yinyang: YinYang;
  qi: QiWei;
  baseScore: number;
  outputEnabled: boolean;
  isLin: boolean;
}

// ── 地支关系检测 ──────────────────────────────────────────

function detectBranchRelations(allBranches: DiZhi[]): BranchRel[] {
  const bs = new Set(allBranches);
  const rels: BranchRel[] = [];

  for (const [b1, b2, b3, wx] of DIZHI_SANHUI) {
    if (bs.has(b1) && bs.has(b2) && bs.has(b3))
      rels.push({ type: 'SanHui', branches: [b1, b2, b3], wuxing: wx });
  }

  for (const [cs, dw, mu, wx] of DIZHI_SANHE) {
    const h = bs.has(cs), d = bs.has(dw), m = bs.has(mu);
    if (h && d && m) {
      rels.push({ type: 'SanHe', branches: [cs, dw, mu], wuxing: wx });
    } else if (d && (h || m)) {
      rels.push({ type: 'BanHe', branches: [cs, dw, mu].filter(b => bs.has(b)) });
    } else if (h && m && !d) {
      rels.push({ type: 'GongHe', branches: [cs, mu] });
    }
  }

  for (const [b1, b2] of DIZHI_LIUHE) {
    if (bs.has(b1) && bs.has(b2)) rels.push({ type: 'LiuHe', branches: [b1, b2] });
  }

  for (const [b1, b2] of DIZHI_LIUCHONG) {
    if (bs.has(b1) && bs.has(b2)) rels.push({ type: 'LiuChong', branches: [b1, b2] });
  }

  for (const xg of DIZHI_XING) {
    if (xg.length === 1) {
      const b = xg[0] as DiZhi;
      if (allBranches.filter(x => x === b).length >= 2)
        rels.push({ type: 'Xing', branches: [b, b] });
    } else if ((xg as DiZhi[]).every(b => bs.has(b))) {
      rels.push({ type: 'Xing', branches: xg as DiZhi[] });
    }
  }

  for (const [b1, b2] of DIZHI_HAI) {
    if (bs.has(b1) && bs.has(b2)) rels.push({ type: 'Hai', branches: [b1, b2] });
  }

  for (const [b1, b2] of DIZHI_PO) {
    if (bs.has(b1) && bs.has(b2)) rels.push({ type: 'Po', branches: [b1, b2] });
  }

  return rels;
}

// ── 主函数 ───────────────────────────────────────────────

export function computeFortuneImbalance(
  natal: BaziSnapshot,
  linPillars: LinPillar[],
): FortuneResult {

  // ── 步骤一：月令永远锚定本命月支，不随大运流年改变 ──
  const yuelingWuxing = natal.pillars.yuelingWuxing;

  // ── 步骤二：合并所有地支（本命四支 + 临入支）──
  const natalBranches: DiZhi[] = [
    natal.pillars.year.branch,
    natal.pillars.month.branch,
    natal.pillars.day.branch,
  ];
  if (natal.pillars.hour) natalBranches.push(natal.pillars.hour.branch);

  const linBranches = linPillars.map(p => p.branch);
  const allBranches = [...natalBranches, ...linBranches];

  // ── 步骤三：地支关系检测（范围：本命+临入所有支）──
  let branchRels = detectBranchRelations(allBranches);

  // 合解冲：三合/六合参与支免疫六冲标签
  // 依据：优先级 会合冲刑破害，有合则冲被化解
  const protectedByHe = new Set<DiZhi>();
  for (const r of branchRels) {
    if (r.type === 'SanHe' || r.type === 'LiuHe') {
      r.branches.forEach(b => protectedByHe.add(b));
    }
  }
  branchRels = branchRels.filter(r =>
    r.type !== 'LiuChong' ||
    !r.branches.some(b => protectedByHe.has(b))
  );

  // ── 步骤四：墓库开库判定（六冲开库）──
  // 若某墓库支出现在六冲关系中，则开库，该支所有藏干 outputEnabled=true
  const openedMuKu = new Set<DiZhi>();
  for (const rel of branchRels) {
    if (rel.type === 'LiuChong') {
      for (const b of rel.branches) {
        if (MU_KU.includes(b)) openedMuKu.add(b);
      }
    }
  }

  // ── 步骤五：合会改写藏干基础分 ──
  // 三会/三合成功时：化神对应藏干 baseScore→30，其他藏干 baseScore→0
  // 临入支参与自动成立；优先级：三会 > 三合（branchRels 中 SanHui 在前，先到先得）
  const branchHuashen = new Map<DiZhi, Wuxing>(); // branch → 化神五行
  for (const rel of branchRels) {
    if ((rel.type === 'SanHui' || rel.type === 'SanHe') && rel.wuxing) {
      for (const b of rel.branches) {
        if (!branchHuashen.has(b)) branchHuashen.set(b, rel.wuxing);
      }
    }
  }

  function getModifiedBaseScore(branch: DiZhi, cgWuxing: Wuxing, origScore: number): number {
    const huashen = branchHuashen.get(branch);
    if (!huashen) return origScore;
    return cgWuxing === huashen ? 30 : 0;
  }

  // ── 步骤六：天干五合判定 ──
  // 临入干参与 → 直接 ZhenHua（跳过紧贴/月令/无克三条件）
  // 本命干之间 → 原有规则不变
  const natalStems: TianGan[] = [
    natal.pillars.year.stem,
    natal.pillars.month.stem,
    natal.pillars.day.stem,
  ];
  if (natal.pillars.hour) natalStems.push(natal.pillars.hour.stem);

  const natalStemNodes: StemNode[] = natalStems.map((stem, i) => ({
    stem,
    wuxing: TIANGAN_WUXING[stem],
    yinyang: TIANGAN_YINYANG[stem],
    isLin: false,
    natalIdx: i,
    isDayStem: i === 2,
  }));

  const linStemNodes: StemNode[] = linPillars.map((p, i) => ({
    stem: p.stem,
    wuxing: TIANGAN_WUXING[p.stem],
    yinyang: TIANGAN_YINYANG[p.stem],
    isLin: true,
    linIdx: i,
    isDayStem: false,
  }));

  const allStemNodes: StemNode[] = [...natalStemNodes, ...linStemNodes];

  const stemKey = (n: StemNode) => n.isLin ? `lin_${n.linIdx}` : `natal_${n.natalIdx}`;
  const hebanStemKeys = new Set<string>();

  // 月令/三会/三合对应五行集合（供本命干五合moonHelps判断）
  const huashenWuxingSet = new Set<Wuxing>([yuelingWuxing]);
  for (const rel of branchRels) {
    if ((rel.type === 'SanHui' || rel.type === 'SanHe') && rel.wuxing)
      huashenWuxingSet.add(rel.wuxing);
  }

  const natalPosMap = ['YearStem', 'MonthStem', 'DayStem', 'HourStem'] as const;

  for (const [s1, s2, huashen] of TIANGAN_WUHE) {
    const n1s = allStemNodes.filter(n => n.stem === s1);
    const n2s = allStemNodes.filter(n => n.stem === s2);
    if (n1s.length === 0 || n2s.length === 0) continue;

    // 争合/妒合：同一天干出现两次以上，合化失败，但不标 HeBan
    if (n1s.length >= 2 || n2s.length >= 2) continue;

    const n1 = n1s[0];
    const n2 = n2s[0];

    if (n1.isLin || n2.isLin) {
      // 临入即成：直接 ZhenHua，跳过三条件
      n1.wuxing = huashen;
      n2.wuxing = huashen;
    } else {
      // 本命干之间：紧贴 + 月令助 + 无克
      const adj = isAdjacent(
        natalPosMap[n1.natalIdx!],
        natalPosMap[n2.natalIdx!],
      );
      const moonHelps = huashenWuxingSet.has(huashen);
      const hasClash = allStemNodes
        .filter(n => n !== n1 && n !== n2)
        .some(n => RESTRAINS[n.wuxing] === huashen);

      if (adj && moonHelps && !hasClash) {
        n1.wuxing = huashen;
        n2.wuxing = huashen;
      } else {
        hebanStemKeys.add(stemKey(n1));
        hebanStemKeys.add(stemKey(n2));
      }
    }
  }

  // ── 步骤七：构建完整藏干节点 ──
  // 本命支：受墓库锁定规则约束（六冲可开库）
  // 临入支：不受本命墓库全锁规则，直接携带藏干能量
  const allCgNodes: CgNode[] = [];

  for (const branch of natalBranches) {
    const isMuKu = MU_KU.includes(branch);
    const locked = isMuKu && !openedMuKu.has(branch);
    for (const { stem, qi, score } of DIZHI_CANGGAN[branch]) {
      const wuxing = TIANGAN_WUXING[stem];
      allCgNodes.push({
        branch, stem, wuxing,
        yinyang: TIANGAN_YINYANG[stem],
        qi,
        baseScore: getModifiedBaseScore(branch, wuxing, score),
        outputEnabled: !locked,
        isLin: false,
      });
    }
  }

  for (const { branch } of linPillars) {
    for (const { stem, qi, score } of DIZHI_CANGGAN[branch]) {
      const wuxing = TIANGAN_WUXING[stem];
      allCgNodes.push({
        branch, stem, wuxing,
        yinyang: TIANGAN_YINYANG[stem],
        qi,
        baseScore: getModifiedBaseScore(branch, wuxing, score),
        outputEnabled: true, // 临入支不受本命墓库规则约束
        isLin: true,
      });
    }
  }

  // ── 步骤八：通根重算 ──
  // 本命天干：可通根进本命支 + 临入支（临入支在场即可作为根源）
  // 临入天干：只通根进自己所属的支（不借力本命支）
  // 通根系数 = baseScore ÷ 10；分配通根系数 = 总系数 ÷ 同五行本命天干数，上限3

  // 统计每个本命干（使用真化后的五行）的总通根系数
  const natalTougen = new Map<string, number>(); // stemKey → capped allocated coeff

  // 先计算每个本命干的原始总通根系数
  const natalRawTougen = new Map<string, number>();
  for (const sn of natalStemNodes) {
    let total = 0;
    for (const cg of allCgNodes) {
      if (!cg.outputEnabled) continue;
      if (cg.wuxing === sn.wuxing) total += cg.baseScore / 10;
    }
    natalRawTougen.set(stemKey(sn), total);
  }

  // 按（真化后）五行分组本命干，共享通根系数
  const natalByWuxing = new Map<Wuxing, StemNode[]>();
  for (const sn of natalStemNodes) {
    const list = natalByWuxing.get(sn.wuxing) ?? [];
    list.push(sn);
    natalByWuxing.set(sn.wuxing, list);
  }

  for (const sn of natalStemNodes) {
    const raw = natalRawTougen.get(stemKey(sn)) ?? 0;
    const count = natalByWuxing.get(sn.wuxing)?.length ?? 1;
    natalTougen.set(stemKey(sn), Math.min(raw / count, 3));
  }

  // 临入天干：只通根进自己所属临入支藏干（baseScore÷10，同五行累加，上限3）
  const linTougen = new Map<string, number>();
  for (const sn of linStemNodes) {
    const ownBranch = linPillars[sn.linIdx!].branch;
    let total = 0;
    for (const cg of allCgNodes) {
      if (!cg.isLin || cg.branch !== ownBranch || !cg.outputEnabled) continue;
      if (cg.wuxing === sn.wuxing) total += cg.baseScore / 10;
    }
    linTougen.set(stemKey(sn), Math.min(total, 3));
  }

  // ── 步骤九：计算能量 ──
  interface EnergyEntry {
    wuxing: Wuxing;
    yinyang: YinYang;
    energy: number;
    outputEnabled: boolean;
    isDayStem: boolean;
  }

  const energyEntries: EnergyEntry[] = [];

  // 本命天干：30 × 月令系数 × (1 + 分配通根系数)
  for (const sn of natalStemNodes) {
    const yueCoeff = YUELING_COEFF[yuelingWuxing][sn.wuxing];
    const tougen = natalTougen.get(stemKey(sn)) ?? 0;
    const energy = 30 * yueCoeff * (1 + tougen);
    const isHeban = hebanStemKeys.has(stemKey(sn));
    energyEntries.push({
      wuxing: sn.wuxing,
      yinyang: sn.yinyang,
      energy,
      outputEnabled: !isHeban || sn.isDayStem,
      isDayStem: sn.isDayStem,
    });
  }

  // 临入天干：30 × (1 + 通根系数_from_own_branch)（移除月令系数，外力不借月令）
  for (const sn of linStemNodes) {
    const tougen = linTougen.get(stemKey(sn)) ?? 0;
    const isHeban = hebanStemKeys.has(stemKey(sn));
    energyEntries.push({
      wuxing: sn.wuxing,
      yinyang: sn.yinyang,
      energy: 30 * (1 + tougen),
      outputEnabled: !isHeban,
      isDayStem: false,
    });
  }

  // 藏干：本命节点保留月令系数；临入节点直接用 baseScore（移除月令系数）
  for (const cg of allCgNodes) {
    const energy = cg.isLin
      ? cg.baseScore
      : cg.baseScore * YUELING_COEFF[yuelingWuxing][cg.wuxing];
    energyEntries.push({
      wuxing: cg.wuxing,
      yinyang: cg.yinyang,
      energy,
      outputEnabled: cg.outputEnabled,
      isDayStem: false,
    });
  }

  // ── 步骤十：十神挂载 + |H - K| ──
  // 十神基于本命日干计算（含真化后的日干五行）
  // 临入节点只作施力方，不受本命反制（太岁不可克）
  const dayNode = natalStemNodes.find(n => n.isDayStem);
  const dmWuxing: Wuxing = dayNode?.wuxing ?? TIANGAN_WUXING[natal.pillars.day.stem];
  const dmYinYang: YinYang = TIANGAN_YINYANG[natal.pillars.day.stem];

  let bijie = 0, shishang = 0, caixin = 0, guansha = 0, yinxing = 0;

  for (const e of energyEntries) {
    if (!e.outputEnabled) continue;
    if (e.isDayStem) {
      bijie += e.energy; // 日主并入比劫组
      continue;
    }
    const ss = calcShiShen(dmWuxing, dmYinYang, e.wuxing, e.yinyang);
    switch (ss) {
      case 'BiJian':   case 'JieCai':    bijie    += e.energy; break;
      case 'ShiShen':  case 'ShangGuan': shishang += e.energy; break;
      case 'PianCai':  case 'ZhengCai':  caixin   += e.energy; break;
      case 'QiSha':    case 'ZhengGuan': guansha  += e.energy; break;
      case 'PianYin':  case 'ZhengYin':  yinxing  += e.energy; break;
    }
  }

  const H = yinxing + bijie;
  const K = shishang + caixin + guansha;

  return {
    imbalance: Math.abs(H - K),
    energies: { bijie, shishang, caixin, guansha, yinxing },
  };
}

// ── 人生K线图数据生成 ─────────────────────────────────────

export function generateLifeChart(
  natal: BaziSnapshot,
  timeline: DestinyTimeline,
  birthYear: number,
): LifeChartData {
  void birthYear; // 年份信息已内含于 section.year / section.age

  // 本命失衡基线（无临入）
  const baseResult = computeFortuneImbalance(natal, []);

  const years: YearScore[] = [];

  for (const chapter of timeline.chapters) {
    const dayunStem = chapter.stem as TianGan;
    const dayunBranch = chapter.branch as DiZhi;

    for (const section of chapter.sections) {
      const liuyearStem = section.stem as TianGan;
      const liuyearBranch = section.branch as DiZhi;

      const result = computeFortuneImbalance(natal, [
        { stem: dayunStem, branch: dayunBranch },
        { stem: liuyearStem, branch: liuyearBranch },
      ]);

      const months: MonthScore[] = [];
      for (let month = 1; month <= 12; month++) {
        const liuyue = getMonthPillar(section.year, month);
        const monthResult = computeFortuneImbalance(natal, [
          { stem: dayunStem, branch: dayunBranch },
          { stem: liuyearStem, branch: liuyearBranch },
          { stem: liuyue.stem, branch: liuyue.branch },
        ]);
        months.push({
          month,
          liuyueStem: liuyue.stem,
          liuyueBranch: liuyue.branch,
          imbalance: monthResult.imbalance,
          energies: monthResult.energies,
        });
      }

      years.push({
        year: section.year,
        age: section.age,
        dayunStem,
        dayunBranch,
        liuyearStem,
        liuyearBranch,
        imbalance: result.imbalance,
        energies: result.energies,
        months,
      });
    }
  }

  return {
    baseline: baseResult.imbalance,
    baselineEnergies: baseResult.energies,
    years,
  };
}
