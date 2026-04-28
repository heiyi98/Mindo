/**
 * AstroMath.ts — 纯数学计算层
 * 球面三角学公式、ASC/MC计算、Placidus/WholeSign宫位系统
 * 无任何外部依赖，纯数学函数
 */

import type { HouseCusp, ZodiacSign, HouseSystem } from './types';

// ─── 常量 ───────────────────────────────────────────────
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// 黄赤交角（当代近似值，精确到0.001度已足够）
const OBLIQUITY = 23.4365;

// ─── 基础工具函数 ────────────────────────────────────────

/** 将角度标准化到 0-360 范围 */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** 角度转弧度 */
export function toRad(deg: number): number {
  return deg * DEG2RAD;
}

/** 弧度转角度 */
export function toDeg(rad: number): number {
  return rad * RAD2DEG;
}

/** 根据黄道经度获取星座名称 */
export function longitudeToSign(longitude: number): ZodiacSign {
  const signs: ZodiacSign[] = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const index = Math.floor(normalizeAngle(longitude) / 30);
  return signs[index];
}

/** 根据黄道经度获取在星座内的度数（0-30）*/
export function longitudeToDegreeInSign(longitude: number): number {
  return normalizeAngle(longitude) % 30;
}

// ─── ASC / MC 计算 ──────────────────────────────────────

/**
 * 计算中天 (MC) 黄道经度
 * 公式：MC = arctan(tan(RAMC) / cos(ε))
 * @param ramc 天顶赤经（度）
 * @param obliquity 黄赤交角（度）
 */
export function calculateMC(ramc: number, obliquity: number = OBLIQUITY): number {
  const ramcRad = toRad(ramc);
  const oblRad = toRad(obliquity);
  const mc = toDeg(Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(oblRad)));
  return normalizeAngle(mc);
}

/**
 * 计算上升点 (ASC) 黄道经度
 * 球面三角学公式
 * @param ramc 天顶赤经（度）
 * @param lat 出生地纬度（度）
 * @param obliquity 黄赤交角（度）
 */
export function calculateASC(
  ramc: number,
  lat: number,
  obliquity: number = OBLIQUITY
): number {
  const ramcRad = toRad(ramc);
  const latRad = toRad(lat);
  const oblRad = toRad(obliquity);

  // 修正版球面三角ASC公式
  const y = -Math.cos(oblRad) * Math.sin(ramcRad);
  const x =
    Math.sin(oblRad) * Math.cos(latRad) +
    Math.cos(oblRad) * Math.sin(latRad) * Math.cos(ramcRad);

  let asc = toDeg(Math.atan2(y, x));
  asc = normalizeAngle(asc);

  // 确保ASC在正确的半球
  if (Math.cos(ramcRad) > 0) {
    asc = normalizeAngle(asc + 180);
  }

  return asc;
}

// ─── 从UTC儒略日计算RAMC ─────────────────────────────────

/**
 * 从儒略日计算格林威治恒星时（GAST），单位：度
 * 简化公式，精度约0.1度，足够占星使用
 */
export function julianDayToRAMC(jd: number, longitude: number): number {
  // J2000.0 起算
  const T = (jd - 2451545.0) / 36525.0;

  // 格林威治平恒星时（度）
  const gast =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;

  // 加上地理经度得到本地恒星时（RAMC）
  const ramc = normalizeAngle(gast + longitude);
  return ramc;
}

// ─── Placidus 宫位计算 ───────────────────────────────────

/**
 * 计算Placidus宫位的单个宫头
 * 使用迭代法求解
 */
function placidusHouseCusp(
  ramc: number,
  lat: number,
  obliquity: number,
  fraction: number
): number {
  const latRad = toRad(lat);
  const oblRad = toRad(obliquity);

  // 迭代求解
  let longitude = ramc + fraction * 90;
  for (let i = 0; i < 50; i++) {
    const longRad = toRad(longitude);
    const ra = toDeg(
      Math.atan2(Math.sin(longRad) * Math.cos(oblRad), Math.cos(longRad))
    );
    const dec = toDeg(Math.asin(Math.sin(longRad) * Math.sin(oblRad)));
    const decRad = toRad(dec);

    const MD = ramc - normalizeAngle(ra);
    const MDRad = toRad(MD);

    const newLong = toDeg(
      Math.atan2(
        Math.sin(MDRad * fraction) * Math.cos(decRad),
        Math.cos(MDRad * fraction) * Math.sin(latRad) * Math.sin(decRad) -
          Math.cos(latRad) * Math.cos(decRad)
      )
    );

    const next = normalizeAngle(newLong);
    if (Math.abs(next - longitude) < 0.0001) break;
    longitude = next;
  }

  return normalizeAngle(longitude);
}

/**
 * 计算完整的Placidus 12宫宫头
 * @throws 高纬度无解时抛出错误
 */
export function calculatePlacidusHouses(
  ramc: number,
  lat: number,
  mc: number,
  asc: number,
  obliquity: number = OBLIQUITY
): HouseCusp[] {
  if (Math.abs(lat) >= 65) {
    throw new Error('POLAR_LATITUDE: Placidus cannot calculate houses above 65° latitude');
  }

  const cusps: number[] = new Array(12);

  // 角宫（固定）
  cusps[0] = asc;                          // 第1宫 = ASC
  cusps[3] = normalizeAngle(mc + 180);     // 第4宫 = IC
  cusps[6] = normalizeAngle(asc + 180);    // 第7宫 = DESC
  cusps[9] = mc;                           // 第10宫 = MC

  // 通过迭代计算中间宫位
  try {
    cusps[1] = placidusHouseCusp(ramc, lat, obliquity, 1 / 3);    // 第2宫
    cusps[2] = placidusHouseCusp(ramc, lat, obliquity, 2 / 3);    // 第3宫
    cusps[10] = placidusHouseCusp(ramc, lat, obliquity, -2 / 3);  // 第11宫
    cusps[11] = placidusHouseCusp(ramc, lat, obliquity, -1 / 3);  // 第12宫

    // 对宫（差180度）
    cusps[4] = normalizeAngle(cusps[10] + 180); // 第5宫
    cusps[5] = normalizeAngle(cusps[11] + 180); // 第6宫
    cusps[7] = normalizeAngle(cusps[1] + 180);  // 第8宫
    cusps[8] = normalizeAngle(cusps[2] + 180);  // 第9宫
  } catch {
    throw new Error('PLACIDUS_CALCULATION_FAILED');
  }

  // 检查NaN
  if (cusps.some(c => isNaN(c))) {
    throw new Error('PLACIDUS_NAN: Calculation produced invalid values');
  }

  return cusps.map((longitude, i) => ({
    house: i + 1,
    longitude,
    sign: longitudeToSign(longitude),
  }));
}

/**
 * 计算整宫制 (Whole Sign) 12宫宫头
 * ASC所在星座为第1宫起点（0度）
 */
export function calculateWholeSignHouses(asc: number): HouseCusp[] {
  const ascSignIndex = Math.floor(normalizeAngle(asc) / 30);
  const cusps: HouseCusp[] = [];

  for (let i = 0; i < 12; i++) {
    const signIndex = (ascSignIndex + i) % 12;
    const longitude = signIndex * 30;
    cusps.push({
      house: i + 1,
      longitude,
      sign: longitudeToSign(longitude),
    });
  }

  return cusps;
}
