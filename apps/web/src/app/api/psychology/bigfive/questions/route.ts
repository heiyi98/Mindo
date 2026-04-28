import { NextResponse } from 'next/server';
import { getAlheimsinsItems } from '@mindo/core/src/psychology/bigfive/alheimsins';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';

  const items = getAlheimsinsItems(locale);

  const questions = items.map(item => ({
    id: item.id,
    text: item.text,
  }));

  return NextResponse.json({ questions });
}
