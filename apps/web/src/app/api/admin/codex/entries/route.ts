import { NextResponse } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { requireCodexAdmin, isCategoryInScope } from '@/lib/codex/requireCodexAdmin';

export async function GET(request: Request) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId') ?? undefined;

  const { data: entries, error } = await codexRepository.listEntries(
    categoryId ? { categoryId } : undefined
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: translations } = await codexRepository.listEntryTranslationsForEntries(
    entries.map((e) => e.id)
  );

  return NextResponse.json({ entries, translations });
}

export async function POST(request: Request) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { categoryId?: string | null; slug?: string };
  const categoryId = body.categoryId ?? null;
  const slug = (body.slug ?? '').trim();
  if (!slug) return NextResponse.json({ error: '必须填写路径标识' }, { status: 400 });

  // categoryId为null＝不归属任何分类的顶层词条，跟"新建顶层分类"是同一种
  // 性质的操作，只有超级管理员能做，见 requireCodexAdmin.ts 顶部说明。
  if (categoryId === null && !admin.isSuperAdmin) {
    return NextResponse.json({ error: '没有权限新建不归属任何分类的词条' }, { status: 403 });
  }
  if (categoryId !== null) {
    const { data: categories } = await codexRepository.listCategories();
    const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
    if (!isCategoryInScope(categoryId, admin, categoriesById)) {
      return NextResponse.json({ error: '没有权限在这个分类下新建词条' }, { status: 403 });
    }
  }

  const { data, error } = await codexRepository.createEntry(categoryId, slug);
  if (error || !data) {
    // 最可能的失败原因：这个路径标识已经被别的词条占用了（entries.slug全局唯一）
    const message = error?.message?.includes('duplicate key')
      ? '这个路径标识已经被别的词条占用，换一个'
      : error?.message ?? '创建失败';
    return NextResponse.json({ error: message }, { status: error?.message?.includes('duplicate key') ? 409 : 500 });
  }

  return NextResponse.json({ id: data.id });
}
