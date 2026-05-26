import type { BaziAnalysis, PatternResult, ShiShen, Wuxing, YinYang } from './types';
import { DIZHI_CANGGAN, TIANGAN_WUXING, TIANGAN_YINYANG } from './constants';
import { calcShiShen } from './utils';

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

export function detectPattern(analysis: BaziAnalysis): PatternResult {
  const { pillars, tianGanHeResults, diZhiRelations, shishenMap, energyNodes, tianGanNodes } = analysis;

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
    if (
      allBranches.every(b => earthBranches.includes(b)) &&
      !energyNodes.some(n => n.wuxing === 'Wood')
    ) {
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
