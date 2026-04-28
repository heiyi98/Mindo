/**
 * PlanetEngine.ts — 星体位置计算层
 * 使用 astronomy-engine (MIT协议) 计算行星黄道经度
 * 封装UTC转换、月亮薛定谔机制
 */

import * as Astronomy from 'astronomy-engine';
import type {
  PlanetPosition,
  PlanetName,
  MoonShiftWarning,
} from './types';
import { longitudeToSign, longitudeToDegreeInSign, normalizeAngle } from './AstroMath';

// ─── 行星映射 ──────────────────────────────────────────

const PLANET_BODY_MAP: Record<PlanetName, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
};

const ALL_PLANETS: PlanetName[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

// ─── 时间转换 ──────────────────────────────────────────

/**
 * 将本地时间转换为UTC的Date对象
 */
export function localTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezoneOffset: number
): Date {
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, 0) -
    timezoneOffset * 3600 * 1000;
  return new Date(utcMs);
}

// ─── 行星位置计算 ──────────────────────────────────────

/**
 * 计算单颗行星的黄道经度
 */
function getPlanetLongitude(body: Astronomy.Body, date: Date): number {
  if (body === Astronomy.Body.Sun) {
    const sunPos = Astronomy.SunPosition(date);
    return normalizeAngle(sunPos.elon);
  }

  if (body === Astronomy.Body.Moon) {
    const moonPos = Astronomy.EclipticGeoMoon(date);
    return normalizeAngle(moonPos.lon);
  }

  // 其他行星：地心黄道坐标
  const geoVec = Astronomy.GeoVector(body, date, false);
  const ecliptic = Astronomy.Ecliptic(geoVec);
  return normalizeAngle(ecliptic.elon);
}

/**
 * 判断行星是否逆行（太阳和月亮永不逆行）
 * 通过比较前后1天的经度变化
 */
function isRetrograde(body: Astronomy.Body, date: Date): boolean {
  if (body === Astronomy.Body.Sun || body === Astronomy.Body.Moon) return false;

  const dayBefore = new Date(date.getTime() - 24 * 3600 * 1000);
  const dayAfter = new Date(date.getTime() + 24 * 3600 * 1000);

  try {
    const lonBefore = getPlanetLongitude(body, dayBefore);
    const lonAfter = getPlanetLongitude(body, dayAfter);

    let diff = lonAfter - lonBefore;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    return diff < 0;
  } catch {
    return false;
  }
}

/**
 * 计算所有行星位置
 */
export function calculatePlanets(date: Date): PlanetPosition[] {
  return ALL_PLANETS.map(name => {
    const body = PLANET_BODY_MAP[name];
    const longitude = getPlanetLongitude(body, date);

    return {
      name,
      longitude,
      sign: longitudeToSign(longitude),
      degree: longitudeToDegreeInSign(longitude),
      isRetrograde: isRetrograde(body, date),
    };
  });
}

// ─── 月亮薛定谔机制 ────────────────────────────────────

/**
 * 检查月亮是否在当天跨越星座边界
 * 分别计算当地时间 00:00 和 23:59 的月亮位置
 */
export function checkMoonShift(
  year: number,
  month: number,
  day: number,
  timezoneOffset: number
): MoonShiftWarning | null {
  const dateStart = localTimeToUTC(year, month, day, 0, 0, timezoneOffset);
  const dateEnd = localTimeToUTC(year, month, day, 23, 59, timezoneOffset);

  const moonLonStart = getPlanetLongitude(Astronomy.Body.Moon, dateStart);
  const moonLonEnd = getPlanetLongitude(Astronomy.Body.Moon, dateEnd);

  const signStart = longitudeToSign(moonLonStart);
  const signEnd = longitudeToSign(moonLonEnd);

  if (signStart !== signEnd) {
    return {
      moonSignShift: true,
      moonSignAtMidnight: signStart,
      moonSignAtEndOfDay: signEnd,
    };
  }

  return null;
}

/**
 * 获取本地恒星时（RAMC），单位：度
 * 使用 astronomy-engine 的 SiderealTime（返回小时）
 */
export function getRAMC(date: Date, longitude: number): number {
  const gastHours = Astronomy.SiderealTime(date);
  const gastDeg = gastHours * 15;
  return ((gastDeg + longitude) % 360 + 360) % 360;
}
