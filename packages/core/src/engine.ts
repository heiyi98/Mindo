import { Solar } from 'lunar-typescript';

const STEM_MAP: Record<string, string> = {
  '甲': 'Jia', '乙': 'Yi', '丙': 'Bing', '丁': 'Ding', '戊': 'Wu',
  '己': 'Ji', '庚': 'Geng', '辛': 'Xin', '壬': 'Ren', '癸': 'Gui', '?': 'Unknown'
};

const BRANCH_MAP: Record<string, string> = {
  '子': 'Zi', '丑': 'Chou', '寅': 'Yin', '卯': 'Mao', '辰': 'Chen', '巳': 'Si',
  '午': 'Wu', '未': 'Wei', '申': 'Shen', '酉': 'You', '戌': 'Xu', '亥': 'Hai', '?': 'Unknown'
};

const SHISHEN_MAP: Record<string, string> = {
  '比肩': 'BiJian', '劫财': 'JieCai', '食神': 'ShiShen', '伤官': 'ShangGuan',
  '偏财': 'PianCai', '正财': 'ZhengCai', '七杀': 'QiSha', '偏官': 'QiSha',
  '正官': 'ZhengGuan', '偏印': 'PianYin', '枭神': 'PianYin', '正印': 'ZhengYin',
  '日主': 'DayMaster', '': 'None'
};

function getElement(char: string): string {
  const map: Record<string, string> = {
    '甲': 'wood', '乙': 'wood', '寅': 'wood', '卯': 'wood',
    '丙': 'fire', '丁': 'fire', '巳': 'fire', '午': 'fire',
    '戊': 'earth', '己': 'earth', '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
    '庚': 'metal', '辛': 'metal', '申': 'metal', '酉': 'metal',
    '壬': 'water', '癸': 'water', '亥': 'water', '子': 'water'
  };
  return map[char] || 'gray';
}

export const engine = {
  calculate: (input: { dateStr: string; lat: number; lng: number; timeUnknown?: boolean }) => {
    const dateParts = input.dateStr.split('T');
    const ymd = dateParts[0].split('-');
    const hm = dateParts[1].split(':');

    let y = parseInt(ymd[0]);
    let m = parseInt(ymd[1]);
    let d = parseInt(ymd[2]);
    let h = parseInt(hm[0]);
    let min = parseInt(hm[1]);

    if (!input.timeUnknown && input.lng) {
      const current = new Date(Date.UTC(y, m - 1, d));
      const start = new Date(Date.UTC(y, 0, 0));
      const dayOfYear = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      const B = (2 * Math.PI / 364) * (dayOfYear - 81);
      const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

      const tz = Math.round(input.lng / 15);
      const centralMeridian = tz * 15;
      const lngTimeDiff = (input.lng - centralMeridian) * 4;

      const totalDiffMinutes = Math.round(eot + lngTimeDiff);
      const tstDate = new Date(Date.UTC(y, m - 1, d, h, min + totalDiffMinutes));

      y = tstDate.getUTCFullYear();
      m = tstDate.getUTCMonth() + 1;
      d = tstDate.getUTCDate();
      h = tstDate.getUTCHours();
      min = tstDate.getUTCMinutes();
    }

    // 日柱路线：用正午12:00锁定公历日期，避免子时（23:xx）被lunar-typescript推进到次日
    const solarDay = Solar.fromYmdHms(y, m, d, 12, 0, 0);
    const lunarDay = solarDay.getLunar();
    const baziDay = lunarDay.getEightChar();
    baziDay.setSect(1);

    // 时柱路线：用实际时间，正确识别时辰（23:xx → 子时）
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
      element: { stem: getElement(rawStem), branch: getElement(rawBranch) }
    });

    return {
      meta: {
        solar_time: solarHour.toYmdHms(),
        lunar_time: lunarDay.toString(),
        jie_qi: lunarDay.getJieQi()
      },
      pillars: {
        year: buildPillar(baziDay.getYearGan(), baziDay.getYearZhi(), baziDay.getYearNaYin(), baziDay.getYearShiShenGan(), baziDay.getYearShiShenZhi(), baziDay.getYearHideGan()),
        month: buildPillar(baziDay.getMonthGan(), baziDay.getMonthZhi(), baziDay.getMonthNaYin(), baziDay.getMonthShiShenGan(), baziDay.getMonthShiShenZhi(), baziDay.getMonthHideGan()),
        day: buildPillar(baziDay.getDayGan(), baziDay.getDayZhi(), baziDay.getDayNaYin(), '日主', baziDay.getDayShiShenZhi(), baziDay.getDayHideGan()),
        hour: input.timeUnknown
          ? { stem: 'Unknown', branch: 'Unknown', element: { stem: 'gray', branch: 'gray' } }
          : buildPillar(baziHour.getTimeGan(), baziHour.getTimeZhi(), baziHour.getTimeNaYin(), baziHour.getTimeShiShenGan(), baziHour.getTimeShiShenZhi(), baziHour.getTimeHideGan())
      },
      extras: {
        taiyuan: baziDay.getTaiYuan(),
        minggong: baziDay.getMingGong(),
        shengong: baziDay.getShenGong()
      }
    };
  }
};
