/**
 * 西洋星盘类型定义
 */

export type ZodiacSign =
  | 'Aries' | 'Taurus' | 'Gemini' | 'Cancer'
  | 'Leo' | 'Virgo' | 'Libra' | 'Scorpio'
  | 'Sagittarius' | 'Capricorn' | 'Aquarius' | 'Pisces';

export type PlanetName =
  | 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars'
  | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

export type HouseSystem = 'Placidus' | 'WholeSign';

export interface PlanetPosition {
  name: PlanetName;
  longitude: number;       // 黄道经度 0-360
  sign: ZodiacSign;        // 所在星座
  degree: number;          // 在星座内的度数 0-30
  isRetrograde: boolean;   // 是否逆行
}

export interface HouseCusp {
  house: number;           // 宫位编号 1-12
  longitude: number;       // 宫头黄道经度
  sign: ZodiacSign;        // 宫头所在星座
}

export interface Angles {
  asc: number;             // 上升点黄道经度
  mc: number;              // 中天黄道经度
  desc: number;            // 下降点黄道经度
  ic: number;              // 天底黄道经度
}

export interface MoonShiftWarning {
  moonSignShift: true;
  moonSignAtMidnight: ZodiacSign;
  moonSignAtEndOfDay: ZodiacSign;
}

// 日期模式（无时间）输入
export interface DateModeInput {
  year: number;
  month: number;
  day: number;
  timezoneOffset: number;  // 小时，例如 +8 或 -5
}

// 时分模式（完整）输入
export interface FullModeInput extends DateModeInput {
  hour: number;
  minute: number;
  lat: number;
  lng: number;
}

// 日期模式输出
export interface DateModeResult {
  mode: 'date';
  planets: PlanetPosition[];
  moonWarning?: MoonShiftWarning;
}

// 时分模式输出
export interface FullModeResult {
  mode: 'full';
  planets: PlanetPosition[];
  angles: Angles;
  houses: {
    cusps: HouseCusp[];
    systemUsed: HouseSystem;
    warning?: string;
  };
}

export type StarChartResult = DateModeResult | FullModeResult;
