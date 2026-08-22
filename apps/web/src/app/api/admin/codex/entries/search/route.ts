import { NextResponse } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { requireCodexAdmin } from '@/lib/codex/requireCodexAdmin';

// 给编辑器里的站内链接(Xref)节点用——只搜"已发布"的词条，保证正在写的稿子
// 不会链到一个读者点进去还看不到的页面。
export async function GET(request: Request) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');
  const q = searchParams.get('q') ?? '';
  if (!locale) return NextResponse.json({ error: 'missing locale' }, { status: 400 });

  const { data, error } = await codexRepository.searchEntries(locale, q);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ results: data });
}
