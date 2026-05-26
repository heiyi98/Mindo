import type { Wuxing, YinYang, ShiShen, GongWeiPos } from './types';
import { GENERATES, RESTRAINS } from './constants';

export function calcShiShen(
  dayMasterWuxing: Wuxing,
  dayMasterYinYang: YinYang,
  targetWuxing: Wuxing,
  targetYinYang: YinYang
): ShiShen {
  const isSameYinYang = dayMasterYinYang === targetYinYang;

  if (targetWuxing === dayMasterWuxing) {
    return isSameYinYang ? 'BiJian' : 'JieCai';
  }
  if (GENERATES[dayMasterWuxing] === targetWuxing) {
    return isSameYinYang ? 'ShiShen' : 'ShangGuan';
  }
  if (RESTRAINS[dayMasterWuxing] === targetWuxing) {
    return isSameYinYang ? 'PianCai' : 'ZhengCai';
  }
  if (RESTRAINS[targetWuxing] === dayMasterWuxing) {
    return isSameYinYang ? 'QiSha' : 'ZhengGuan';
  }
  if (GENERATES[targetWuxing] === dayMasterWuxing) {
    return isSameYinYang ? 'PianYin' : 'ZhengYin';
  }
  return 'BiJian';
}

export function isAdjacent(pos1: GongWeiPos, pos2: GongWeiPos): boolean {
  const stemOrder = ['YearStem', 'MonthStem', 'DayStem', 'HourStem'];
  const i1 = stemOrder.indexOf(pos1);
  const i2 = stemOrder.indexOf(pos2);
  if (i1 === -1 || i2 === -1) return false;
  return Math.abs(i1 - i2) === 1;
}
