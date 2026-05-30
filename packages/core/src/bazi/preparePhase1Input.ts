import type { BaziSnapshot, GongWeiPos, ShiShen, Wuxing, YinYang } from './types';
import { computeWuxingAssessment } from './yongshen';
import { TIANGAN_WUXING, TIANGAN_YINYANG, GENERATES, RESTRAINS } from './constants';

type StrengthLabel = '极强' | '强' | '中' | '弱' | '极弱' | '缺失';

function getStrengthLabel(value: number, mean: number): StrengthLabel {
  if (value === 0) return '缺失';
  if (value > mean * 2.00) return '极强';
  if (value > mean * 1.25) return '强';
  if (value > mean * 0.50) return '中';
  if (value > mean * 0.25) return '弱';
  return '极弱';
}

// energyNodes 中每个节点已有 pos: GongWeiPos，直接用 pos 映射
const PALACE_LABEL: Record<GongWeiPos, string> = {
  YearStem:    '年柱', YearBranch:  '年柱',
  MonthStem:   '月柱', MonthBranch: '月柱',
  DayStem:     '日柱', DayBranch:   '日柱',
  HourStem:    '时柱', HourBranch:  '时柱',
};

const POSITION_LABEL: Record<GongWeiPos, string> = {
  YearStem:    '年干', YearBranch:  '年支',
  MonthStem:   '月干', MonthBranch: '月支',
  DayStem:     '日干', DayBranch:   '日支',
  HourStem:    '时干', HourBranch:  '时支',
};

const ALL_TEN_SHISHEN: Exclude<ShiShen, 'DayMaster'>[] = [
  'BiJian', 'JieCai', 'ShiShen', 'ShangGuan',
  'PianCai', 'ZhengCai', 'QiSha', 'ZhengGuan',
  'PianYin', 'ZhengYin',
];

function buildShishenMeta(
  dayStem: BaziSnapshot['dayStem']
): Record<string, { wuxing: Wuxing; yinyang: YinYang }> {
  const dayWuxing = TIANGAN_WUXING[dayStem];
  const dayYinyang = TIANGAN_YINYANG[dayStem];
  const opposite: YinYang = dayYinyang === 'Yang' ? 'Yin' : 'Yang';

  const generates = GENERATES[dayWuxing];
  const restrains = RESTRAINS[dayWuxing];
  const restrainsDay = (Object.entries(RESTRAINS) as [Wuxing, Wuxing][])
    .find(([, v]) => v === dayWuxing)![0];
  const generatesDay = (Object.entries(GENERATES) as [Wuxing, Wuxing][])
    .find(([, v]) => v === dayWuxing)![0];

  return {
    BiJian:    { wuxing: dayWuxing,    yinyang: dayYinyang },
    JieCai:    { wuxing: dayWuxing,    yinyang: opposite },
    ShiShen:   { wuxing: generates,    yinyang: dayYinyang },
    ShangGuan: { wuxing: generates,    yinyang: opposite },
    PianCai:   { wuxing: restrains,    yinyang: dayYinyang },
    ZhengCai:  { wuxing: restrains,    yinyang: opposite },
    QiSha:     { wuxing: restrainsDay, yinyang: dayYinyang },
    ZhengGuan: { wuxing: restrainsDay, yinyang: opposite },
    PianYin:   { wuxing: generatesDay, yinyang: dayYinyang },
    ZhengYin:  { wuxing: generatesDay, yinyang: opposite },
  };
}

export function preparePhase1Input(snapshot: BaziSnapshot): object {
  const activeInfluences = snapshot.influence.shishenInfluence.filter(g => g.totalInfluence > 0);
  const mean = activeInfluences.length > 0
    ? activeInfluences.reduce((s, g) => s + g.totalInfluence, 0) / activeInfluences.length
    : 0;

  // 第二处：shishenInfluence 加 wuxing/yinyang，补全十神
  const shishenMeta = buildShishenMeta(snapshot.dayStem);
  const existingShishenSet = new Set(snapshot.influence.shishenInfluence.map(g => g.shishen));

  const shishenWithStrength = [
    ...snapshot.influence.shishenInfluence.map(g => ({
      ...g,
      strength: getStrengthLabel(g.totalInfluence, mean),
      wuxing: shishenMeta[g.shishen].wuxing,
      yinyang: shishenMeta[g.shishen].yinyang,
    })),
    ...ALL_TEN_SHISHEN
      .filter(ss => !existingShishenSet.has(ss))
      .map(ss => ({
        shishen: ss,
        nodes: [] as { id: string; energy: number; weight: number; influence: number }[],
        totalInfluence: 0,
        strength: '缺失' as StrengthLabel,
        wuxing: shishenMeta[ss].wuxing,
        yinyang: shishenMeta[ss].yinyang,
      })),
  ];

  // 第一处：energyNodes 加 shishen 字段
  const shishenById = new Map(snapshot.shishen.shishenMap.map(n => [n.id, n.shishen]));

  // 第三处：藏干透出可见性索引
  const visibilityById = new Map(
    snapshot.tougen.cangGanVisibility.map(v => [v.cangganId, v])
  );

  const nodesWithPalace = snapshot.energy.energyNodes.map(n => {
    const base = {
      ...n,
      palace: PALACE_LABEL[n.pos],
      positionLabel: POSITION_LABEL[n.pos],
      shishen: shishenById.get(n.id),
    };

    // 第三处：藏干节点若透出，标注透出天干宫位
    if (n.type === 'CangGan') {
      const visibility = visibilityById.get(n.id);
      if (visibility?.tag === 'TouChu') {
        const tianGanNode = snapshot.pillars.tianGanNodes.find(tg => tg.wuxing === n.wuxing);
        if (tianGanNode) {
          return { ...base, transparentThrough: tianGanNode.pos };
        }
      }
    }

    return base;
  });

  const wuxingAssessment = computeWuxingAssessment(snapshot);

  return {
    dayStem: snapshot.dayStem,
    energyScores: snapshot.energyScores,
    shishenInfluence: shishenWithStrength,
    tougen: snapshot.tougen,
    relations: snapshot.relations,
    energyNodes: nodesWithPalace,
    wuxingAssessment,
  };
}
