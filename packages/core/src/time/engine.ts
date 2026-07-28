import { find } from 'geo-tz';

export interface TimeInput {
  dateStr: string;
  lat?: number | null;
  lng?: number | null;
  timeUnknown?: boolean;
  minuteUnknown?: boolean;
  timezone?: string | null;
}

export interface UniversalTimeResult {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  solarTimeStr: string; // 提供给前端展示的基准参考时间
  isTimeUnknown: boolean;
  isMinuteUnknown: boolean;
}

export function calculateUniversalTime(input: TimeInput): UniversalTimeResult {
  const dateParts = input.dateStr.split('T');
  const ymd = dateParts[0].split('-');
  const hmStr = dateParts[1] || '0';
  const hm = hmStr.split(':');

  let y = parseInt(ymd[0]);
  let m = parseInt(ymd[1]);
  let d = parseInt(ymd[2]);
  let h = parseInt(hm[0] || '0');
  let min = hm[1] ? parseInt(hm[1]) : 0;

  const birthY = y, birthM = m, birthD = d;
  let solarDisplayMinutes = h * 60 + min;
  const isMinuteUnknown = input.minuteUnknown || false;
  const isTimeUnknown = input.timeUnknown || false;

  if (!isTimeUnknown && input.lng && input.lat) {
    let utcOffsetMinutes = 480; 

    const tzName = input.timezone || (() => {
      try {
        const tzNames = find(input.lat!, input.lng!);
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

    let eot = 0;
    
    // 【核心逻辑】：如果分钟未知，使用规整的15度地理真时区进行偏移；如果已知，用精确经度加天文均时差
    const lngOffsetMinutes = isMinuteUnknown 
      ? Math.round(input.lng / 15) * 60 
      : (input.lng * 4);

    if (!isMinuteUnknown) {
      const current = new Date(Date.UTC(y, m - 1, d));
      const start = new Date(Date.UTC(y, 0, 0));
      const dayOfYear = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const B = (2 * Math.PI / 364) * (dayOfYear - 81);
      eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    }

    const localMinutes = h * 60 + min;
    const utcMinutes = localMinutes - utcOffsetMinutes;
    const solarMinutes = utcMinutes + lngOffsetMinutes + eot;

    solarDisplayMinutes = solarMinutes;

    const baseDate = new Date(Date.UTC(y, m - 1, d, 0, 0));
    baseDate.setUTCMinutes(Math.round(solarMinutes));

    y = baseDate.getUTCFullYear();
    m = baseDate.getUTCMonth() + 1;
    d = baseDate.getUTCDate();
    h = baseDate.getUTCHours();
    min = baseDate.getUTCMinutes();
  }

  // 生成供前端卡片展示的标准时间字符串
  const solarDisplayDate = new Date(Date.UTC(birthY, birthM - 1, birthD, 0, 0));
  solarDisplayDate.setUTCMinutes(Math.round(solarDisplayMinutes));
  const sdY = solarDisplayDate.getUTCFullYear();
  const sdM = String(solarDisplayDate.getUTCMonth() + 1).padStart(2, '0');
  const sdD = String(solarDisplayDate.getUTCDate()).padStart(2, '0');
  const sdH = String(solarDisplayDate.getUTCHours()).padStart(2, '0');
  const sdMin = String(solarDisplayDate.getUTCMinutes()).padStart(2, '0');
  const solarTimeStr = `${sdY}-${sdM}-${sdD} ${sdH}:${sdMin}:00`;

  return {
    year: y, month: m, day: d, hour: h, minute: min,
    solarTimeStr, isTimeUnknown, isMinuteUnknown
  };
}