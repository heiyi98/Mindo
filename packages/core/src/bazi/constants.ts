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

export const YUELING_COEFF: Record<Wuxing, Record<Wuxing, number>> = {
  Wood:  { Wood: 2.0,  Fire: 1.33, Earth: 0.67, Metal: 0.33, Water: 0.83 },
  Fire:  { Fire: 2.0,  Earth: 1.33, Metal: 0.67, Water: 0.33, Wood: 0.83 },
  Earth: { Earth: 2.0, Metal: 1.33, Water: 0.67, Wood: 0.33,  Fire: 0.83 },
  Metal: { Metal: 2.0, Water: 1.33, Wood: 0.67,  Fire: 0.33,  Earth: 0.83 },
  Water: { Water: 2.0, Wood: 1.33,  Fire: 0.67,  Earth: 0.33, Metal: 0.83 }
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

export const GONGWEI_WEIGHT: Record<GongWeiPos, number> = {
  YearStem:    1 / Math.sqrt(4),
  YearBranch:  1 / Math.sqrt(5),
  MonthStem:   1 / Math.sqrt(1),
  MonthBranch: 1 / Math.sqrt(2),
  DayStem:     1,
  DayBranch:   1 / Math.sqrt(1),
  HourStem:    1 / Math.sqrt(1),
  HourBranch:  1 / Math.sqrt(2),
};

export const GENERATES: Record<Wuxing, Wuxing> = {
  Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood'
};

export const RESTRAINS: Record<Wuxing, Wuxing> = {
  Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood'
};
