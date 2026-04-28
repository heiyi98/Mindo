// packages/core/src/energy-engine.ts

export type Wuxing = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

const WUXING_RELATIONS = {
  generate: { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' },
  restrain: { Wood: 'Earth', Earth: 'Water', Water: 'Fire', Fire: 'Metal', Metal: 'Wood' }
} as const;

const STEMS_ENERGY: Record<string, Partial<Record<Wuxing, number>>> = {
  Jia: { Wood: 30 }, Yi: { Wood: 30 },
  Bing: { Fire: 30 }, Ding: { Fire: 30 },
  Wu: { Earth: 30 }, Ji: { Earth: 30 },
  Geng: { Metal: 30 }, Xin: { Metal: 30 },
  Ren: { Water: 30 }, Gui: { Water: 30 }
};

const BRANCHES_ENERGY: Record<string, Partial<Record<Wuxing, number>>> = {
  Zi: { Water: 30 },
  Chou: { Earth: 18, Water: 9, Metal: 3 },
  Yin: { Wood: 16, Fire: 7, Earth: 7 },
  Mao: { Wood: 30 },
  Chen: { Earth: 18, Wood: 9, Water: 3 },
  Si: { Fire: 16, Metal: 7, Earth: 7 },
  Wu: { Fire: 21, Earth: 9 },
  Wei: { Earth: 18, Fire: 9, Wood: 3 },
  Shen: { Metal: 16, Water: 7, Earth: 7 },
  You: { Metal: 30 },
  Xu: { Earth: 18, Metal: 9, Fire: 3 },
  Hai: { Water: 21, Wood: 9 }
};

const DISTANCE_MULTIPLIER: Record<string, number> = {
  DayStem: 1.0,
  DayBranch: 1.0,
  MonthStem: 1.0,
  HourStem: 1.0,
  MonthBranch: 0.85,
  HourBranch: 0.85,
  YearStem: 0.30,
  YearBranch: 0.10
};

export interface BaziGridInput {
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  hour: { stem: string; branch: string };
}

export const energyEngine = {
  calculateStaticEnergy: (grid: BaziGridInput) => {
    const finalEnergy: Record<Wuxing, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };

    const nodes = {
      YearStem: STEMS_ENERGY[grid.year.stem] || {},
      YearBranch: BRANCHES_ENERGY[grid.year.branch] || {},
      MonthStem: STEMS_ENERGY[grid.month.stem] || {},
      MonthBranch: BRANCHES_ENERGY[grid.month.branch] || {},
      DayStem: STEMS_ENERGY[grid.day.stem] || {},
      DayBranch: BRANCHES_ENERGY[grid.day.branch] || {},
      HourStem: STEMS_ENERGY[grid.hour.stem] || {},
      HourBranch: BRANCHES_ENERGY[grid.hour.branch] || {}
    };

    const monthBranchEnergy = nodes.MonthBranch;
    let commander: Wuxing = 'Earth';
    let maxVal = -1;
    for (const [element, val] of Object.entries(monthBranchEnergy)) {
      if (val > maxVal) { maxVal = val; commander = element as Wuxing; }
    }

    const getEnvMultiplier = (element: Wuxing, cmd: Wuxing): number => {
      if (element === cmd) return 2.0;
      if (WUXING_RELATIONS.generate[cmd as keyof typeof WUXING_RELATIONS.generate] === element) return 1.33;
      if (WUXING_RELATIONS.generate[element as keyof typeof WUXING_RELATIONS.generate] === cmd) return 0.83;
      if (WUXING_RELATIONS.restrain[element as keyof typeof WUXING_RELATIONS.restrain] === cmd) return 0.67;
      if (WUXING_RELATIONS.restrain[cmd as keyof typeof WUXING_RELATIONS.restrain] === element) return 0.33;
      return 1.0;
    };

    for (const [nodeName, atomicEnergy] of Object.entries(nodes)) {
      const mDist = DISTANCE_MULTIPLIER[nodeName];
      for (const [element, eBase] of Object.entries(atomicEnergy)) {
        const mEnv = getEnvMultiplier(element as Wuxing, commander);
        const eActual = (eBase as number) * mEnv * mDist;
        finalEnergy[element as Wuxing] += eActual;
      }
    }

    return finalEnergy;
  }
};
