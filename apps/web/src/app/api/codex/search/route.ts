import { codexRepository } from '@/lib/codex/adminClient';

// 站内公开搜索：直接查数据库（标题/路径关键字匹配+status='published'过滤），
// 不再依赖fumadocs的flexsearch索引。目前只匹配标题/slug，不匹配正文全文——
// 正文存成Tiptap JSON，要做真正的全文检索需要另外建索引列，这次先用最简单
// 能用的版本，全文搜索留到有真实内容量、有实际需要时再加。
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale');
  const q = searchParams.get('q') ?? '';
  if (!locale) return Response.json({ error: 'missing locale' }, { status: 400 });

  const { data, error } = await codexRepository.searchEntries(locale, q, 30);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ results: data });
}
