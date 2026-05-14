import { Solar } from 'lunar-typescript';
import { find } from 'geo-tz';

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
  calculate: (input: { dateStr: string; lat: number; lng: number; timeUnknown?: boolean; timezone?: string }) => {
    const dateParts = input.dateStr.split('T');
    const ymd = dateParts[0].split('-');
    const hm = dateParts[1].split(':');

    let y = parseInt(ymd[0]);
    let m = parseInt(ymd[1]);
    let d = parseInt(ymd[2]);
    let h = parseInt(hm[0]);
    let min = parseInt(hm[1]);

    const birthY = y, birthM = m, birthD = d;
    // solarMinutes 通过 setUTCMinutes 已编码为本地时钟读数（lng*4 ≈ utcOffset 相消）
    let solarDisplayMinutes = h * 60 + min;

    if (!input.timeUnknown && input.lng && input.lat) {
      // 第一步：查行政时区，获取UTC偏移（优先使用档案存储的时区，避免重复查询）
      let utcOffsetMinutes = 480; // 默认UTC+8

      const tzName = input.timezone || (() => {
        try {
          const tzNames = find(input.lat, input.lng);
          return tzNames[0] || null;
        } catch {
          return null;
        }
      })();

      if (tzName) {
        try {
          const testDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          const localParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: tzName,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).formatToParts(testDate);
          const get = (type: string) =>
            parseInt(localParts.find(p => p.type === type)?.value || '0');
          const localH = get('hour');
          const localMin = get('minute');
          const localTotalMin = localH * 60 + localMin;
          let offsetMin = localTotalMin - 720;
          if (offsetMin > 720) offsetMin -= 1440;
          if (offsetMin < -720) offsetMin += 1440;
          utcOffsetMinutes = offsetMin;
        } catch {
          utcOffsetMinutes = Math.round(input.lng / 15) * 60;
        }
      }

      // 第二步：均时差（Equation of Time）
      const current = new Date(Date.UTC(y, m - 1, d));
      const start = new Date(Date.UTC(y, 0, 0));
      const dayOfYear = Math.floor(
        (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const B = (2 * Math.PI / 364) * (dayOfYear - 81);
      const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

      // 第三步：行政时间转UTC
      const localMinutes = h * 60 + min;
      const utcMinutes = localMinutes - utcOffsetMinutes;

      // 第四步：真太阳时（基于UTC + 地理经度）
      const solarMinutes = utcMinutes + (input.lng * 4) + eot;

      solarDisplayMinutes = solarMinutes;

      // 第五步：真太阳时直接用于排盘
      // solarMinutes 是基于UTC+地理经度的真太阳时（分钟数，从当天0点起算）
      // 不需要转回行政时间，直接传给 lunar-typescript
      const baseDate = new Date(Date.UTC(y, m - 1, d, 0, 0));
      baseDate.setUTCMinutes(Math.round(solarMinutes));

      y = baseDate.getUTCFullYear();
      m = baseDate.getUTCMonth() + 1;
      d = baseDate.getUTCDate();
      h = baseDate.getUTCHours();
      min = baseDate.getUTCMinutes();
    }

    // solar_time 显示：solarMinutes 通过 setUTCMinutes 已编码为本地时钟读数，直接格式化
    const solarDisplayDate = new Date(Date.UTC(birthY, birthM - 1, birthD, 0, 0));
    solarDisplayDate.setUTCMinutes(Math.round(solarDisplayMinutes));
    const sdY = solarDisplayDate.getUTCFullYear();
    const sdM = String(solarDisplayDate.getUTCMonth() + 1).padStart(2, '0');
    const sdD = String(solarDisplayDate.getUTCDate()).padStart(2, '0');
    const sdH = String(solarDisplayDate.getUTCHours()).padStart(2, '0');
    const sdMin = String(solarDisplayDate.getUTCMinutes()).padStart(2, '0');
    const solarTimeStr = `${sdY}-${sdM}-${sdD} ${sdH}:${sdMin}:00`;

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
        solar_time: solarTimeStr,
        lunar_time: lunarDay.toString(),
        jie_qi: lunarDay.getJieQi()
      },
      pillars: {
        year: buildPillar(baziDay.getYearGan(), baziDay.getYearZhi(), baziDay.getYearNaYin(), baziDay.getYearShiShenGan(), baziDay.getYearShiShenZhi(), baziDay.getYearHideGan()),
        month: buildPillar(baziDay.getMonthGan(), baziDay.getMonthZhi(), baziDay.getMonthNaYin(), baziDay.getMonthShiShenGan(), baziDay.getMonthShiShenZhi(), baziDay.getMonthHideGan()),
        day: buildPillar(baziDay.getDayGan(), baziDay.getDayZhi(), baziDay.getDayNaYin(), '日主', baziDay.getDayShiShenZhi(), baziDay.getDayHideGan()),
        hour: input.timeUnknown
          ? { stem: 'Unknown', branch: 'Unknown', element: { stem: 'gray', branch: 'gray' } }
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
