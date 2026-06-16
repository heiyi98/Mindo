export interface TimezoneOption {
  ianaName: string;
  offsetLabel: string;
  offsetMinutes: number;
  regions: string;
  hasDst: boolean;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { ianaName: 'Pacific/Midway',       offsetLabel: 'UTC-11',          offsetMinutes: -660, regions: 'Pacific_Midway',      hasDst: false },
  { ianaName: 'Pacific/Honolulu',     offsetLabel: 'UTC-10',          offsetMinutes: -600, regions: 'Pacific_Honolulu',    hasDst: false },
  { ianaName: 'America/Adak',         offsetLabel: 'UTC-10/−9',       offsetMinutes: -600, regions: 'America_Adak',        hasDst: true  },
  { ianaName: 'Pacific/Marquesas',    offsetLabel: 'UTC-9:30',        offsetMinutes: -570, regions: 'Pacific_Marquesas',   hasDst: false },
  { ianaName: 'America/Anchorage',    offsetLabel: 'UTC-9/−8',        offsetMinutes: -540, regions: 'America_Anchorage',   hasDst: true  },
  { ianaName: 'America/Los_Angeles',  offsetLabel: 'UTC-8/−7',        offsetMinutes: -480, regions: 'America_Los_Angeles', hasDst: true  },
  { ianaName: 'America/Phoenix',      offsetLabel: 'UTC-7',           offsetMinutes: -420, regions: 'America_Phoenix',     hasDst: false },
  { ianaName: 'America/Denver',       offsetLabel: 'UTC-7/−6',        offsetMinutes: -420, regions: 'America_Denver',      hasDst: true  },
  { ianaName: 'America/Chicago',      offsetLabel: 'UTC-6/−5',        offsetMinutes: -360, regions: 'America_Chicago',     hasDst: true  },
  { ianaName: 'America/Mexico_City',  offsetLabel: 'UTC-6',           offsetMinutes: -360, regions: 'America_Mexico_City', hasDst: false },
  { ianaName: 'America/New_York',     offsetLabel: 'UTC-5/−4',        offsetMinutes: -300, regions: 'America_New_York',    hasDst: true  },
  { ianaName: 'America/Bogota',       offsetLabel: 'UTC-5',           offsetMinutes: -300, regions: 'America_Bogota',      hasDst: false },
  { ianaName: 'America/Caracas',      offsetLabel: 'UTC-4',           offsetMinutes: -240, regions: 'America_Caracas',     hasDst: false },
  { ianaName: 'America/Halifax',      offsetLabel: 'UTC-4/−3',        offsetMinutes: -240, regions: 'America_Halifax',     hasDst: true  },
  { ianaName: 'America/St_Johns',     offsetLabel: 'UTC-3:30',        offsetMinutes: -210, regions: 'America_St_Johns',    hasDst: true  },
  { ianaName: 'America/Sao_Paulo',    offsetLabel: 'UTC-3',           offsetMinutes: -180, regions: 'America_Sao_Paulo',   hasDst: false },
  { ianaName: 'America/Noronha',      offsetLabel: 'UTC-2',           offsetMinutes: -120, regions: 'America_Noronha',     hasDst: false },
  { ianaName: 'Atlantic/Azores',      offsetLabel: 'UTC-1/0',         offsetMinutes:  -60, regions: 'Atlantic_Azores',     hasDst: true  },
  { ianaName: 'Atlantic/Cape_Verde',  offsetLabel: 'UTC-1',           offsetMinutes:  -60, regions: 'Atlantic_Cape_Verde', hasDst: false },
  { ianaName: 'Europe/London',        offsetLabel: 'UTC+0/+1',        offsetMinutes:    0, regions: 'Europe_London',       hasDst: true  },
  { ianaName: 'Africa/Abidjan',       offsetLabel: 'UTC+0',           offsetMinutes:    0, regions: 'Africa_Abidjan',      hasDst: false },
  { ianaName: 'Europe/Paris',         offsetLabel: 'UTC+1/+2',        offsetMinutes:   60, regions: 'Europe_Paris',        hasDst: true  },
  { ianaName: 'Africa/Lagos',         offsetLabel: 'UTC+1',           offsetMinutes:   60, regions: 'Africa_Lagos',        hasDst: false },
  { ianaName: 'Africa/Casablanca',    offsetLabel: 'UTC+1',           offsetMinutes:   60, regions: 'Africa_Casablanca',   hasDst: true  },
  { ianaName: 'Europe/Athens',        offsetLabel: 'UTC+2/+3',        offsetMinutes:  120, regions: 'Europe_Athens',       hasDst: true  },
  { ianaName: 'Africa/Cairo',         offsetLabel: 'UTC+2',           offsetMinutes:  120, regions: 'Africa_Cairo',        hasDst: false },
  { ianaName: 'Asia/Beirut',          offsetLabel: 'UTC+2/+3',        offsetMinutes:  120, regions: 'Asia_Beirut',         hasDst: true  },
  { ianaName: 'Asia/Jerusalem',       offsetLabel: 'UTC+2/+3',        offsetMinutes:  120, regions: 'Asia_Jerusalem',      hasDst: true  },
  { ianaName: 'Europe/Moscow',        offsetLabel: 'UTC+3',           offsetMinutes:  180, regions: 'Europe_Moscow',       hasDst: false },
  { ianaName: 'Asia/Tehran',          offsetLabel: 'UTC+3:30',        offsetMinutes:  210, regions: 'Asia_Tehran',         hasDst: false },
  { ianaName: 'Asia/Dubai',           offsetLabel: 'UTC+4',           offsetMinutes:  240, regions: 'Asia_Dubai',          hasDst: false },
  { ianaName: 'Asia/Kabul',           offsetLabel: 'UTC+4:30',        offsetMinutes:  270, regions: 'Asia_Kabul',          hasDst: false },
  { ianaName: 'Asia/Karachi',         offsetLabel: 'UTC+5',           offsetMinutes:  300, regions: 'Asia_Karachi',        hasDst: false },
  { ianaName: 'Asia/Kolkata',         offsetLabel: 'UTC+5:30',        offsetMinutes:  330, regions: 'Asia_Kolkata',        hasDst: false },
  { ianaName: 'Asia/Kathmandu',       offsetLabel: 'UTC+5:45',        offsetMinutes:  345, regions: 'Asia_Kathmandu',      hasDst: false },
  { ianaName: 'Asia/Dhaka',           offsetLabel: 'UTC+6',           offsetMinutes:  360, regions: 'Asia_Dhaka',          hasDst: false },
  { ianaName: 'Asia/Yangon',          offsetLabel: 'UTC+6:30',        offsetMinutes:  390, regions: 'Asia_Yangon',         hasDst: false },
  { ianaName: 'Asia/Bangkok',         offsetLabel: 'UTC+7',           offsetMinutes:  420, regions: 'Asia_Bangkok',        hasDst: false },
  { ianaName: 'Asia/Shanghai',        offsetLabel: 'UTC+8',           offsetMinutes:  480, regions: 'Asia_Shanghai',       hasDst: false },
  { ianaName: 'Australia/Eucla',      offsetLabel: 'UTC+8:45',        offsetMinutes:  525, regions: 'Australia_Eucla',     hasDst: false },
  { ianaName: 'Asia/Tokyo',           offsetLabel: 'UTC+9',           offsetMinutes:  540, regions: 'Asia_Tokyo',          hasDst: false },
  { ianaName: 'Australia/Darwin',     offsetLabel: 'UTC+9:30',        offsetMinutes:  570, regions: 'Australia_Darwin',    hasDst: false },
  { ianaName: 'Australia/Adelaide',   offsetLabel: 'UTC+9:30/+10:30', offsetMinutes:  570, regions: 'Australia_Adelaide',  hasDst: true  },
  { ianaName: 'Australia/Sydney',     offsetLabel: 'UTC+10/+11',      offsetMinutes:  600, regions: 'Australia_Sydney',    hasDst: true  },
  { ianaName: 'Pacific/Guam',         offsetLabel: 'UTC+10',          offsetMinutes:  600, regions: 'Pacific_Guam',        hasDst: false },
  { ianaName: 'Pacific/Norfolk',      offsetLabel: 'UTC+11',          offsetMinutes:  660, regions: 'Pacific_Norfolk',     hasDst: false },
  { ianaName: 'Pacific/Auckland',     offsetLabel: 'UTC+12/+13',      offsetMinutes:  720, regions: 'Pacific_Auckland',    hasDst: true  },
  { ianaName: 'Pacific/Fiji',         offsetLabel: 'UTC+12',          offsetMinutes:  720, regions: 'Pacific_Fiji',        hasDst: false },
  { ianaName: 'Pacific/Tongatapu',    offsetLabel: 'UTC+13',          offsetMinutes:  780, regions: 'Pacific_Tongatapu',   hasDst: false },
  { ianaName: 'Pacific/Kiritimati',   offsetLabel: 'UTC+14',          offsetMinutes:  840, regions: 'Pacific_Kiritimati',  hasDst: false },
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
