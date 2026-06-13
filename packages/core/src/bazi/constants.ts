import type { TianGan, DiZhi, Wuxing, YinYang, QiWei, GongWeiPos } from './types';

export const TIANGAN_WUXING: Record<TianGan, Wuxing> = {
  Jia: 'Wood', Yi: 'Wood',
  Bing: 'Fire', Ding: 'Fire',
  Wu: 'Earth', Ji: 'Earth',
  Geng: 'Metal', Xin: 'Metal',
  Ren: 'Water', Gui: 'Water'
};

export const TIANGAN_YINYANG: Record<TianGan, YinYang> = {
  Jia: 'Yang', Yi: 'Yin',
  Bing: 'Yang', Ding: 'Yin',
  Wu: 'Yang', Ji: 'Yin',
  Geng: 'Yang', Xin: 'Yin',
  Ren: 'Yang', Gui: 'Yin'
};

// 传统纳甲，各气在月中的司令天数比例，本气:中气:余气（各支合计不超过30）
export const DIZHI_CANGGAN: Record<DiZhi, { stem: TianGan; qi: QiWei; score: number }[]> = {
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

export const MU_KU: DiZhi[] = ['Chen', 'Xu', 'Chou', 'Wei'];

/**
 * 月令旺衰系数 — 斐波那契能量递减模型
 * 基于斐波那契数列倒序前五项 (8, 5, 3, 2, 1) 除以基准常数 4：
 *   得令 (旺，同我)   = 8/4 = 2.00  — 能量极盛，完全顺应月令
 *   近旺 (相，生我)   = 5/4 = 1.25  — 母体滋养，被月令生助
 *   泄气 (休，我生)   = 3/4 = 0.75  — 主动输出，能量流向月令
 *   受制 (囚，月令所克) = 2/4 = 0.50 — 受月令压制
 *   失令 (死，克我)   = 1/4 = 0.25  — 逆势克制月令，能量冰点
 */
export const YUELING_COEFF: Record<Wuxing, Record<Wuxing, number>> = {
  Wood:  { Wood: 2.00, Fire: 1.25, Earth: 0.50, Metal: 0.25, Water: 0.75 },
  Fire:  { Fire: 2.00, Earth: 1.25, Metal: 0.50, Water: 0.25, Wood: 0.75 },
  Earth: { Earth: 2.00, Metal: 1.25, Water: 0.50, Wood: 0.25, Fire: 0.75 },
  Metal: { Metal: 2.00, Water: 1.25, Wood: 0.50, Fire: 0.25, Earth: 0.75 },
  Water: { Water: 2.00, Wood: 1.25, Fire: 0.50, Earth: 0.25, Metal: 0.75 }
};

export const TIANGAN_WUHE: [TianGan, TianGan, Wuxing][] = [
  ['Jia', 'Ji',   'Earth'],
  ['Yi',  'Geng', 'Metal'],
  ['Bing','Xin',  'Water'],
  ['Ding','Ren',  'Wood'],
  ['Wu',  'Gui',  'Fire']
];

export const TIANGAN_CHONG: [TianGan, TianGan][] = [
  ['Jia', 'Geng'],
  ['Yi',  'Xin'],
  ['Bing','Ren'],
  ['Ding','Gui']
];

export const DIZHI_SANHUI: [DiZhi, DiZhi, DiZhi, Wuxing][] = [
  ['Yin', 'Mao', 'Chen', 'Wood'],
  ['Si',  'Wu',  'Wei',  'Fire'],
  ['Shen','You', 'Xu',   'Metal'],
  ['Hai', 'Zi',  'Chou', 'Water']
];

export const DIZHI_SANHE: [DiZhi, DiZhi, DiZhi, Wuxing][] = [
  ['Hai', 'Mao', 'Wei',  'Wood'],
  ['Yin', 'Wu',  'Xu',   'Fire'],
  ['Si',  'You', 'Chou', 'Metal'],
  ['Shen','Zi',  'Chen', 'Water']
];

export const DIZHI_LIUHE: [DiZhi, DiZhi][] = [
  ['Zi','Chou'], ['Yin','Hai'], ['Mao','Xu'],
  ['Chen','You'], ['Si','Shen'], ['Wu','Wei']
];

export const DIZHI_LIUCHONG: [DiZhi, DiZhi][] = [
  ['Zi','Wu'], ['Chou','Wei'], ['Yin','Shen'],
  ['Mao','You'], ['Chen','Xu'], ['Si','Hai']
];

export const DIZHI_XING: DiZhi[][] = [
  ['Yin', 'Si', 'Shen'],
  ['Chou', 'Xu', 'Wei'],
  ['Zi', 'Mao'],
  ['Chen'],
  ['Wu'],
  ['You'],
  ['Hai']
];

export const DIZHI_HAI: [DiZhi, DiZhi][] = [
  ['Zi','Wei'], ['Chou','Wu'], ['Yin','Si'],
  ['Mao','Chen'], ['Shen','Hai'], ['You','Xu']
];

export const DIZHI_PO: [DiZhi, DiZhi][] = [
  ['Zi','You'], ['Chou','Chen'], ['Yin','Hai'],
  ['Mao','Wu'], ['Si','Shen'], ['Wei','Xu']
];

// 宫位权重：日干为原点，各宫位到日干的勾股距离取倒数（列距=天干列差，行距=干支行差各1）
export const GONGWEI_WEIGHT: Record<GongWeiPos, number> = {
  YearStem:    1 / Math.sqrt(4), // 距日干2列，sqrt(2²)=2
  YearBranch:  1 / Math.sqrt(5), // 距日干2列+1行，sqrt(2²+1²)
  MonthStem:   1 / Math.sqrt(1), // 距日干1列，sqrt(1²)=1
  MonthBranch: 1 / Math.sqrt(2), // 距日干1列+1行，sqrt(1²+1²)
  DayStem:     1,                // 原点，权重锚定为1
  DayBranch:   1 / Math.sqrt(1), // 距日干1行，sqrt(1²)=1
  HourStem:    1 / Math.sqrt(1), // 距日干1列，sqrt(1²)=1
  HourBranch:  1 / Math.sqrt(2), // 距日干1列+1行，sqrt(1²+1²)
};

export const GENERATES: Record<Wuxing, Wuxing> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood'
};

export const RESTRAINS: Record<Wuxing, Wuxing> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood'
};
