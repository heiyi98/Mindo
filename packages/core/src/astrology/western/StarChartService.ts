/**
 * StarChartService.ts — 业务路由层
 * 接收用户输入，路由到日期模式或时分模式
 * 组装最终JSON输出
 */

import type {
  DateModeInput,
  FullModeInput,
  DateModeResult,
  FullModeResult,
  StarChartResult,
} from './types';
import { calculatePlanets, checkMoonShift, localTimeToUTC, getRAMC } from './PlanetEngine';
import {
  calculateASC,
  calculateMC,
  calculatePlacidusHouses,
  calculateWholeSignHouses,
  normalizeAngle,
} from './AstroMath';

/**
 * 日期模式：只有日期，无精确时间
 * 锁定为当地时间12:00计算行星位置
 * 不计算宫位和ASC/MC
 */
export function calculateDateMode(input: DateModeInput): DateModeResult {
  const { year, month, day, timezoneOffset } = input;

  const utcDate = localTimeToUTC(year, month, day, 12, 0, timezoneOffset);
  const planets = calculatePlanets(utcDate);

  const moonShift = checkMoonShift(year, month, day, timezoneOffset);

  if (moonShift) {
    const moonPlanet = planets.find(p => p.name === 'Moon');
    if (moonPlanet) {
      // 月亮星座不确定，标记为 null
      (moonPlanet as any).sign = null;
      (moonPlanet as any).uncertain = true;
    }
  }

  const result: DateModeResult = { mode: 'date', planets };
  if (moonShift) {
    result.moonWarning = moonShift;
  }

  return result;
}

/**
 * 时分模式：完整数据，计算全维度星盘
 * 包含ASC、MC、Placidus宫位（高纬度降级为Whole Sign）
 */
export function calculateFullMode(input: FullModeInput): FullModeResult {
  const { year, month, day, hour, minute, timezoneOffset, lat, lng } = input;

  const utcDate = localTimeToUTC(year, month, day, hour, minute, timezoneOffset);
  const planets = calculatePlanets(utcDate);

  const ramc = getRAMC(utcDate, lng);
  const mc = calculateMC(ramc);
  const asc = calculateASC(ramc, lat);

  const angles = {
    asc,
    mc,
    desc: normalizeAngle(asc + 180),
    ic: normalizeAngle(mc + 180),
  };

  let houseResult: FullModeResult['houses'];

  if (Math.abs(lat) >= 65) {
    houseResult = {
      cusps: calculateWholeSignHouses(asc),
      systemUsed: 'WholeSign',
      warning: `Placidus houses cannot be calculated for latitude ${lat.toFixed(2)}°. Whole Sign system applied automatically.`,
    };
  } else {
    try {
      houseResult = {
        cusps: calculatePlacidusHouses(ramc, lat, mc, asc),
        systemUsed: 'Placidus',
      };
    } catch {
      houseResult = {
        cusps: calculateWholeSignHouses(asc),
        systemUsed: 'WholeSign',
        warning: 'Placidus calculation failed. Whole Sign system applied automatically.',
      };
    }
  }

  return {
    mode: 'full',
    planets,
    angles,
    houses: houseResult,
  };
}

/**
 * 主入口：自动路由到日期模式或时分模式
 */
export function calculateStarChart(
  input: DateModeInput | FullModeInput
): StarChartResult {
  const full = input as FullModeInput;

  const isFullMode =
    full.hour !== undefined &&
    full.minute !== undefined &&
    full.lat !== undefined &&
    full.lng !== undefined;

  if (isFullMode) {
    return calculateFullMode(full);
  }

  return calculateDateMode(input as DateModeInput);
}
