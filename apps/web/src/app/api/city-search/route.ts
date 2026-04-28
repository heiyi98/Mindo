import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const lang = searchParams.get('lang') || 'en';

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&accept-language=${lang}&limit=5`,
      {
        headers: {
          'User-Agent': 'Mindo-Quantum-Engine/1.0',
        }
      }
    );

    if (!res.ok) throw new Error('OSM API Error');

    const data = await res.json();
    const results = data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('City Search Error:', error);
    return NextResponse.json({ error: 'Failed to fetch coordinates' }, { status: 500 });
  }
}
