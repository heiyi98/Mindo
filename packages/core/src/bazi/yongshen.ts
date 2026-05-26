import type {
  BaziAnalysis, YongshenResult, Wuxing, YinYang, EnergyNode
} from './types';
import { GENERATES, RESTRAINS } from './constants';
import { calcShiShen } from './utils';

const WUXING_LIST: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
type WxState = Record<Wuxing, number>;

// 返回能量更低的阴阳（相等时取 Yang）
function selectLowerYinyang(wx: Wuxing, nodes: EnergyNode[]): YinYang {
  let yang = 0, yin = 0;
  for (const n of nodes) {
    if (n.wuxing === wx && n.outputEnabled) {
      if (n.yinyang === 'Yang') yang += n.energy;
      else yin += n.energy;
    }
  }
  return yin < yang ? 'Yin' : 'Yang';
}

// 按关系类别找对应五行（跳过日主同五行）
function wxByCat(dmWx: Wuxing, dmYy: YinYang, cat: 'shishen' | 'cai' | 'guan' | 'yin'): Wuxing {
  for (const w of WUXING_LIST) {
    if (w === dmWx) continue;
    const ss = calcShiShen(dmWx, dmYy, w, 'Yang');
    if (
      (cat === 'shishen' && (ss === 'ShiShen'   || ss === 'ShangGuan')) ||
      (cat === 'cai'     && (ss === 'PianCai'    || ss === 'ZhengCai'))  ||
      (cat === 'guan'    && (ss === 'QiSha'       || ss === 'ZhengGuan')) ||
      (cat === 'yin'     && (ss === 'PianYin'     || ss === 'ZhengYin'))
    ) return w;
  }
  return dmWx;
}

// 链式反应：生克同时作用，用初始值计算 Δ，同步应用
function chainReact(s: WxState, t: number): WxState {
  const d: WxState = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const a of WUXING_LIST) {
    const b = GENERATES[a];
    const delta = (s[a] * s[b]) / t;
    d[a] -= delta; d[b] += delta;
  }
  for (const a of WUXING_LIST) {
    const b = RESTRAINS[a];
    const delta = (s[a] * s[b]) / t;
    d[a] -= delta; d[b] -= delta; // 互耗
  }
  const r: WxState = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const w of WUXING_LIST) r[w] = Math.max(0, s[w] + d[w]);
  return r;
}

function detectNormalYongshen(
  dmWx: Wuxing, dmYy: YinYang,
  energyNodes: EnergyNode[]
): YongshenResult {
  // 步骤 0：纯能量分组（outputEnabled，含日主）
  const state0: WxState = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const n of energyNodes) {
    if (n.outputEnabled) state0[n.wuxing] += n.energy;
  }
  const T = WUXING_LIST.reduce((s, w) => s + state0[w], 0) || 1;

  // 步骤 1：第一轮链式反应
  const state1 = chainReact(state0, T);
  const T1 = WUXING_LIST.reduce((s, w) => s + state1[w], 0) || 1;

  // 十神阵营五行
  const shishenWx = GENERATES[dmWx];           // 食伤
  const caiWx     = RESTRAINS[dmWx];            // 财星
  const yinWx     = wxByCat(dmWx, dmYy, 'yin'); // 印星
  const guanWx    = wxByCat(dmWx, dmYy, 'guan');// 官杀

  // 步骤 2+3+4：对五个候选 W 评分
  let bestWx: Wuxing = WUXING_LIST[0];
  let bestScore = Infinity;

  for (const W of WUXING_LIST) {
    // 步骤 2：临（W=30 对 state1 各五行的影响）
    const lin: WxState = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
    for (const X of WUXING_LIST) {
      const xv = state1[X];
      let dX = 0;
      if (GENERATES[W] === X) dX += (xv * 30) / T1;  // W生X
      if (RESTRAINS[W] === X) dX -= (xv * 30) / T1;  // W克X
      if (GENERATES[X] === W) dX -= (xv * 30) / T1;  // X泄耗
      if (RESTRAINS[X] === W) dX -= (xv * 30) / T1;  // X克W互耗
      if (X === W)             dX += (xv * 30) / T1;  // 同气共鸣
      lin[X] = Math.max(0, xv + dX);
    }

    // 步骤 3：第二轮链式反应
    const T_lin = WUXING_LIST.reduce((s, w) => s + lin[w], 0) || 1;
    const state2 = chainReact(lin, T_lin);

    // 步骤 4：评分 Score = |H/K - 1|
    const H = state2[yinWx] + state2[dmWx];
    const K = state2[guanWx] + state2[shishenWx] + state2[caiWx];
    const score = (H === 0 && K === 0) ? 0
                : K === 0              ? Infinity
                : Math.abs(H / K - 1);

    if (score < bestScore) {
      bestScore = score;
      bestWx = W;
    }
  }

  // 步骤 5：阴阳选优（命盘中能量更低者）
  const selectedYy = selectLowerYinyang(bestWx, energyNodes);
  return {
    wuxing:  bestWx,
    yinyang: selectedYy,
    shishen: calcShiShen(dmWx, dmYy, bestWx, selectedYy),
  };
}

export function detectYongshen(analysis: BaziAnalysis): YongshenResult | undefined {
  if (!analysis.pattern) return undefined;

  const { energyNodes, tianGanNodes } = analysis;
  const dmNode = tianGanNodes.find(n => n.pos === 'DayStem')!;
  const dmWx = dmNode.wuxing;
  const dmYy = dmNode.yinyang;

  const makeResult = (wx: Wuxing): YongshenResult => {
    const yy = selectLowerYinyang(wx, energyNodes);
    return { wuxing: wx, yinyang: yy, shishen: calcShiShen(dmWx, dmYy, wx, yy) };
  };

  const { category, name } = analysis.pattern;

  // 化气格：化神五行（ZhenHua 后已更新至 dmWx）的食伤五行
  if (category === 'huaqi') {
    return makeResult(wxByCat(dmWx, dmYy, 'shishen'));
  }

  // 专旺格：日主同五行（比肩或劫财）
  if (category === 'zhuanwang') {
    return makeResult(dmWx);
  }

  // 从格：按子格固定映射
  if (category === 'cong') {
    if (name === '从儿格') return makeResult(wxByCat(dmWx, dmYy, 'shishen'));
    if (name === '从财格') return makeResult(wxByCat(dmWx, dmYy, 'cai'));
    if (name === '从杀格') return makeResult(wxByCat(dmWx, dmYy, 'guan'));
    if (name === '从强格') return makeResult(wxByCat(dmWx, dmYy, 'yin'));
    return undefined;
  }

  // 正格：纯能量+链式反应+临+评分+阴阳选优
  return detectNormalYongshen(dmWx, dmYy, energyNodes);
}
