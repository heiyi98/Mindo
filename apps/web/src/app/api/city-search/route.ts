import { NextResponse } from 'next/server';
import { getAdministrativeTimezone } from '@/lib/administrative-timezones';

const OSM_HEADERS = { 'User-Agent': 'Mindo-Quantum-Engine/1.0' };

function extractRegion(address: any) {
  return {
    region_level1: address?.state || address?.province || address?.region || null,
    region_level2: address?.county || address?.district || address?.municipality || null,
    region_level3: address?.city || address?.town || address?.village || address?.suburb || null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const rawLang = searchParams.get('lang') || 'en';
  const needRegion = searchParams.get('needRegion') === 'true';

  const langMap: Record<string, string> = { zh: 'zh-Hans', 'zh-Hant': 'zh-Hant' };
  const lang = langMap[rawLang] ?? rawLang;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=${lang}&limit=5&addressdetails=1`,
      { headers: OSM_HEADERS }
    );
    if (!res.ok) throw new Error('OSM API Error');
    const data = await res.json();

    let results = data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      const countryCode = item.address?.country_code || '';
      const stateCode = item.address?.['ISO3166-2-lvl4'] || '';
      const timezone = getAdministrativeTimezone(countryCode, stateCode);
      return {
        name: item.display_name,
        lat,
        lng,
        timezone,
        region_country: item.address?.country_code?.toUpperCase() || null,
        ...extractRegion(item.address),
      };
    });

    // When needRegion=true, replace region names with English via reverse geocode
    if (needRegion) {
      results = await Promise.all(
        results.map(async (result: any) => {
          try {
            const rev = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${result.lat}&lon=${result.lng}&addressdetails=1&accept-language=en`,
              { headers: OSM_HEADERS }
            );
            if (!rev.ok) return result;
            const revData = await rev.json();
            return { ...result, ...extractRegion(revData.address) };
          } catch {
            return result;
          }
        })
      );
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('City Search Error:', error);
    return NextResponse.json({ error: 'Failed to fetch coordinates' }, { status: 500 });
  }
}
