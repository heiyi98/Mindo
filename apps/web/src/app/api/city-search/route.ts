import { NextResponse } from 'next/server';
import { getAdministrativeTimezone } from '@/lib/administrative-timezones';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const lang = searchParams.get('lang') || 'en';

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=${lang}&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Mindo-Quantum-Engine/1.0',
        }
      }
    );
    if (!res.ok) throw new Error('OSM API Error');
    const data = await res.json();

    const results = data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      // 从addressdetails读取国家代码和省级代码
      const countryCode = item.address?.country_code || '';
      const stateCode = item.address?.['ISO3166-2-lvl4'] || '';

      // 查行政时区映射表
      const timezone = getAdministrativeTimezone(countryCode, stateCode);

      return {
        name: item.display_name,
        lat,
        lng,
        timezone,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('City Search Error:', error);
    return NextResponse.json({ error: 'Failed to fetch coordinates' }, { status: 500 });
  }
}
