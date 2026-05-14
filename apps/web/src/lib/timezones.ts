export interface TimezoneOption {
  ianaName: string;
  offsetLabel: string;
  offsetMinutes: number;
  regions: string;
  hasDst: boolean;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { ianaName: 'Pacific/Midway',       offsetLabel: 'UTC-11',         offsetMinutes: -660, regions: '中途岛、萨摩亚',                       hasDst: false },
  { ianaName: 'Pacific/Honolulu',     offsetLabel: 'UTC-10',         offsetMinutes: -600, regions: '夏威夷',                               hasDst: false },
  { ianaName: 'America/Adak',         offsetLabel: 'UTC-10/−9',      offsetMinutes: -600, regions: '阿留申群岛（含夏令时）',               hasDst: true  },
  { ianaName: 'Pacific/Marquesas',    offsetLabel: 'UTC-9:30',       offsetMinutes: -570, regions: '马克萨斯群岛',                         hasDst: false },
  { ianaName: 'America/Anchorage',    offsetLabel: 'UTC-9/−8',       offsetMinutes: -540, regions: '阿拉斯加（含夏令时）',                 hasDst: true  },
  { ianaName: 'America/Los_Angeles',  offsetLabel: 'UTC-8/−7',       offsetMinutes: -480, regions: '美国太平洋时区（含夏令时）',           hasDst: true  },
  { ianaName: 'America/Phoenix',      offsetLabel: 'UTC-7',          offsetMinutes: -420, regions: '亚利桑那州（无夏令时）',               hasDst: false },
  { ianaName: 'America/Denver',       offsetLabel: 'UTC-7/−6',       offsetMinutes: -420, regions: '美国山地时区（含夏令时）',             hasDst: true  },
  { ianaName: 'America/Chicago',      offsetLabel: 'UTC-6/−5',       offsetMinutes: -360, regions: '美国中部时区（含夏令时）',             hasDst: true  },
  { ianaName: 'America/Mexico_City',  offsetLabel: 'UTC-6',          offsetMinutes: -360, regions: '墨西哥城',                             hasDst: false },
  { ianaName: 'America/New_York',     offsetLabel: 'UTC-5/−4',       offsetMinutes: -300, regions: '美国东部时区（含夏令时）',             hasDst: true  },
  { ianaName: 'America/Bogota',       offsetLabel: 'UTC-5',          offsetMinutes: -300, regions: '哥伦比亚、秘鲁、厄瓜多尔',             hasDst: false },
  { ianaName: 'America/Caracas',      offsetLabel: 'UTC-4',          offsetMinutes: -240, regions: '委内瑞拉',                             hasDst: false },
  { ianaName: 'America/Halifax',      offsetLabel: 'UTC-4/−3',       offsetMinutes: -240, regions: '加拿大大西洋时区（含夏令时）',         hasDst: true  },
  { ianaName: 'America/St_Johns',     offsetLabel: 'UTC-3:30',       offsetMinutes: -210, regions: '纽芬兰（含夏令时）',                   hasDst: true  },
  { ianaName: 'America/Sao_Paulo',    offsetLabel: 'UTC-3',          offsetMinutes: -180, regions: '巴西利亚、圣保罗',                     hasDst: false },
  { ianaName: 'America/Noronha',      offsetLabel: 'UTC-2',          offsetMinutes: -120, regions: '费尔南多-迪诺罗尼亚岛',               hasDst: false },
  { ianaName: 'Atlantic/Azores',      offsetLabel: 'UTC-1/0',        offsetMinutes:  -60, regions: '亚速尔群岛（含夏令时）',               hasDst: true  },
  { ianaName: 'Atlantic/Cape_Verde',  offsetLabel: 'UTC-1',          offsetMinutes:  -60, regions: '佛得角',                               hasDst: false },
  { ianaName: 'Europe/London',        offsetLabel: 'UTC+0/+1',       offsetMinutes:    0, regions: '英国、爱尔兰（含夏令时）',             hasDst: true  },
  { ianaName: 'Africa/Abidjan',       offsetLabel: 'UTC+0',          offsetMinutes:    0, regions: '冰岛、加纳、塞内加尔',                 hasDst: false },
  { ianaName: 'Europe/Paris',         offsetLabel: 'UTC+1/+2',       offsetMinutes:   60, regions: '法国、德国、意大利、西班牙（含夏令时）', hasDst: true },
  { ianaName: 'Africa/Lagos',         offsetLabel: 'UTC+1',          offsetMinutes:   60, regions: '尼日利亚、喀麦隆、刚果',               hasDst: false },
  { ianaName: 'Europe/Athens',        offsetLabel: 'UTC+2/+3',       offsetMinutes:  120, regions: '希腊、芬兰、爱沙尼亚（含夏令时）',     hasDst: true  },
  { ianaName: 'Africa/Cairo',         offsetLabel: 'UTC+2',          offsetMinutes:  120, regions: '埃及、南非、津巴布韦',                 hasDst: false },
  { ianaName: 'Europe/Moscow',        offsetLabel: 'UTC+3',          offsetMinutes:  180, regions: '莫斯科、伊斯坦布尔、沙特',             hasDst: false },
  { ianaName: 'Asia/Tehran',          offsetLabel: 'UTC+3:30',       offsetMinutes:  210, regions: '伊朗',                                 hasDst: false },
  { ianaName: 'Asia/Dubai',           offsetLabel: 'UTC+4',          offsetMinutes:  240, regions: '阿联酋、阿曼、格鲁吉亚',               hasDst: false },
  { ianaName: 'Asia/Kabul',           offsetLabel: 'UTC+4:30',       offsetMinutes:  270, regions: '阿富汗',                               hasDst: false },
  { ianaName: 'Asia/Karachi',         offsetLabel: 'UTC+5',          offsetMinutes:  300, regions: '巴基斯坦、塔什干',                     hasDst: false },
  { ianaName: 'Asia/Kolkata',         offsetLabel: 'UTC+5:30',       offsetMinutes:  330, regions: '印度、斯里兰卡',                       hasDst: false },
  { ianaName: 'Asia/Kathmandu',       offsetLabel: 'UTC+5:45',       offsetMinutes:  345, regions: '尼泊尔',                               hasDst: false },
  { ianaName: 'Asia/Dhaka',           offsetLabel: 'UTC+6',          offsetMinutes:  360, regions: '孟加拉国、哈萨克斯坦东部',             hasDst: false },
  { ianaName: 'Asia/Yangon',          offsetLabel: 'UTC+6:30',       offsetMinutes:  390, regions: '缅甸',                                 hasDst: false },
  { ianaName: 'Asia/Bangkok',         offsetLabel: 'UTC+7',          offsetMinutes:  420, regions: '泰国、越南、印尼西部',                 hasDst: false },
  { ianaName: 'Asia/Shanghai',        offsetLabel: 'UTC+8',          offsetMinutes:  480, regions: '中国、香港、台湾、新加坡、马来西亚',   hasDst: false },
  { ianaName: 'Australia/Eucla',      offsetLabel: 'UTC+8:45',       offsetMinutes:  525, regions: '澳大利亚边境地区',                     hasDst: false },
  { ianaName: 'Asia/Tokyo',           offsetLabel: 'UTC+9',          offsetMinutes:  540, regions: '日本、韩国、朝鲜',                     hasDst: false },
  { ianaName: 'Australia/Darwin',     offsetLabel: 'UTC+9:30',       offsetMinutes:  570, regions: '澳大利亚北领地',                       hasDst: false },
  { ianaName: 'Australia/Adelaide',   offsetLabel: 'UTC+9:30/+10:30',offsetMinutes:  570, regions: '澳大利亚南澳（含夏令时）',             hasDst: true  },
  { ianaName: 'Australia/Sydney',     offsetLabel: 'UTC+10/+11',     offsetMinutes:  600, regions: '澳大利亚东部（含夏令时）',             hasDst: true  },
  { ianaName: 'Pacific/Guam',         offsetLabel: 'UTC+10',         offsetMinutes:  600, regions: '关岛、塞班岛',                         hasDst: false },
  { ianaName: 'Pacific/Norfolk',      offsetLabel: 'UTC+11',         offsetMinutes:  660, regions: '诺福克岛',                             hasDst: false },
  { ianaName: 'Pacific/Auckland',     offsetLabel: 'UTC+12/+13',     offsetMinutes:  720, regions: '新西兰（含夏令时）',                   hasDst: true  },
  { ianaName: 'Pacific/Fiji',         offsetLabel: 'UTC+12',         offsetMinutes:  720, regions: '斐济',                                 hasDst: false },
  { ianaName: 'Pacific/Tongatapu',    offsetLabel: 'UTC+13',         offsetMinutes:  780, regions: '汤加、萨摩亚',                         hasDst: false },
  { ianaName: 'Pacific/Kiritimati',   offsetLabel: 'UTC+14',         offsetMinutes:  840, regions: '莱恩群岛（基里巴斯）',                 hasDst: false },
];

export function findTimezoneByIana(ianaName: string): TimezoneOption | undefined {
  return TIMEZONE_OPTIONS.find(tz => tz.ianaName === ianaName);
}

export function matchTimezoneOption(ianaName: string): TimezoneOption {
  const direct = TIMEZONE_OPTIONS.find(tz => tz.ianaName === ianaName);
  if (direct) return direct;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaName,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date(Date.UTC(
      now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0
    )));
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const min = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const offsetMin = h * 60 + min - 720;

    return TIMEZONE_OPTIONS.reduce((closest, tz) => {
      return Math.abs(tz.offsetMinutes - offsetMin) < Math.abs(closest.offsetMinutes - offsetMin)
        ? tz : closest;
    });
  } catch {
    return TIMEZONE_OPTIONS.find(tz => tz.ianaName === 'Asia/Shanghai')!;
  }
}
