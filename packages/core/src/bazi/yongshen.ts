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
  // 准备：原局纯能量（outputEnabled，按五行累加，不含宫位权重）
  const baseState: WxState = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const n of energyNodes) {
    if (n.outputEnabled) baseState[n.wuxing] += n.energy;
  }
  const T = WUXING_LIST.reduce((s, w) => s + baseState[w], 0) || 1;

  // 十神阵营五行
  const shishenWx = GENERATES[dmWx];            // 食伤
  const caiWx     = RESTRAINS[dmWx];             // 财星
  const yinWx     = wxByCat(dmWx, dmYy, 'yin'); // 印星
  const guanWx    = wxByCat(dmWx, dmYy, 'guan');// 官杀

  const ε = 0.01;
  let bestWx: Wuxing = WUXING_LIST[0];
  let bestScore = Infinity;

  for (const W of WUXING_LIST) {
    // 1. 将候选五行加入命盘（+30）后整体重算
    const state: WxState = { ...baseState };
    state[W] += 30;
    const T_aug = T + 30;

    // 2. 一轮链式反应
    const finalState = chainReact(state, T_aug);

    // 3. 帮扶方 H / 克泄方 K
    const H = finalState[yinWx] + finalState[dmWx];
    const K = finalState[guanWx] + finalState[shishenWx] + finalState[caiWx];

    // 4. Score = |H/K - 1|；K 极小时直接用 H（越大越差）
    const score = K < ε ? H : Math.abs(H / K - 1);

    if (score < bestScore) {
      bestScore = score;
      bestWx = W;
    }
  }

  // 阴阳选优：取命盘中该五行能量更低的阴阳
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
