import { Solar } from 'lunar-typescript';
import type { UniversalTimeResult } from '../time';

export const STEM_MAP: Record<string, string> = {
  '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu',
  '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui', '?': 'Unknown'
};

export const BRANCH_MAP: Record<string, string> = {
  '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si',
  '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai', '?': 'Unknown'
};

const SHISHEN_MAP: Record<string, string> = {
  '比肩': 'BiJian', '劫财': 'JieCai', '食神': 'ShiShen', '伤官': 'ShangGuan',
  '偏财': 'PianCai', '正财': 'ZhengCai', '七杀': 'QiSha', '偏官': 'QiSha',
  '正官': 'ZhengGuan', '偏印': 'PianYin', '枭神': 'PianYin', '正印': 'ZhengYin',
  '日主': 'DayMaster', '': 'None'
};

export const baziEngine = {
  // 参数类型直接引用 time 模块的 UniversalTimeResult，不再自己手写一份
  // 长得很像的类型。这样以后 time/engine.ts 那边改字段名，这里编译期
  // 就会报错，不用等运行时某个值变成 undefined 才发现两边对不上。
  calculate: (timeData: UniversalTimeResult) => {
    const { year: y, month: m, day: d, hour: h, minute: min, solarTimeStr, isTimeUnknown } = timeData;

    // 日柱路线
    const solarDay = Solar.fromYmdHms(y, m, d, 12, 0, 0);
    const lunarDay = solarDay.getLunar();
    const baziDay = lunarDay.getEightChar();
    baziDay.setSect(1);

    // 时柱路线
    const solarHour = Solar.fromYmdHms(y, m, d, h, min, 0);
    const lunarHour = solarHour.getLunar();
    const baziHour = lunarHour.getEightChar();
    baziHour.setSect(1);

    const buildPillar = (
      rawStem: string, rawBranch: string, nayin: string,
      rawShishenStem: string, rawShishenBranch: string[], rawHiddenStems: string[]
    ) => ({
      stem: STEM_MAP[rawStem] || rawStem,
      branch: BRANCH_MAP[rawBranch] || rawBranch,
      nayin,
      shishenStem: SHISHEN_MAP[rawShishenStem] || rawShishenStem,
      shishenBranch: rawShishenBranch.map(ss => SHISHEN_MAP[ss] || ss),
      hiddenStems: rawHiddenStems.map(hs => STEM_MAP[hs] || hs),
    });

    return {
      meta: {
        solar_time: solarTimeStr, 
        lunar_time: lunarDay.toString(),
        jie_qi: lunarDay.getJieQi()
      },
      pillars: {
        year: buildPillar(baziDay.getYearGan(), baziDay.getYearZhi(), baziDay.getYearNaYin(), baziDay.getYearShiShenGan(), baziDay.getYearShiShenZhi(), baziDay.getYearHideGan()),
        month: buildPillar(baziDay.getMonthGan(), baziDay.getMonthZhi(), baziDay.getMonthNaYin(), baziDay.getMonthShiShenGan(), baziDay.getMonthShiShenZhi(), baziDay.getMonthHideGan()),
        day: buildPillar(baziDay.getDayGan(), baziDay.getDayZhi(), baziDay.getDayNaYin(), '日主', baziDay.getDayShiShenZhi(), baziDay.getDayHideGan()),
        hour: isTimeUnknown
          ? { stem: 'Unknown', branch: 'Unknown', nayin: '', shishenStem: '', shishenBranch: [], hiddenStems: [] }
          : buildPillar(baziHour.getTimeGan(), baziHour.getTimeZhi(), baziHour.getTimeNaYin(), baziHour.getTimeShiShenGan(), baziHour.getTimeShiShenZhi(), baziHour.getTimeShiShenZhi())
      },
      extras: {
        taiyuan: baziDay.getTaiYuan(),
        minggong: baziDay.getMingGong(),
        shengong: baziDay.getShenGong()
      }
    };
  }
};