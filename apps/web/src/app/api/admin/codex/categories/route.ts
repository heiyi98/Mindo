import { NextResponse } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { requireCodexAdmin, isCategoryInScope } from '@/lib/codex/requireCodexAdmin';
import { slugifySuggestion } from '@/lib/codex/slugify';

export async function GET() {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: categories, error: catError }, { data: translations, error: trError }] =
    await Promise.all([codexRepository.listCategories(), codexRepository.listCategoryTranslations()]);
  if (catError || trError) {
    return NextResponse.json({ error: (catError ?? trError)!.message }, { status: 500 });
  }

  return NextResponse.json({ categories, translations });
}

export async function POST(request: Request) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { parentId?: string | null; name?: string; slug?: string };
  const parentId = body.parentId ?? null;
  const name = (body.name ?? '').trim();
  const slug = (body.slug ?? '').trim() || slugifySuggestion(name);
  if (!name) return NextResponse.json({ error: '分类名称不能为空' }, { status: 400 });

  // 新建顶层分类（没有parent_id）只有超级管理员能做，范围受限的管理员只能在
  // 自己被授权的分类下面新建子分类。
  if (parentId === null && !admin.isSuperAdmin) {
    return NextResponse.json({ error: '没有权限新建顶层分类' }, { status: 403 });
  }
  if (parentId !== null) {
    const { data: categories } = await codexRepository.listCategories();
    const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
    if (!isCategoryInScope(parentId, admin, categoriesById)) {
      return NextResponse.json({ error: '没有权限在这个分类下新建子分类' }, { status: 403 });
    }
  }

  const { data, error } = await codexRepository.createCategory({
    parentId,
    translations: [{ locale: 'zh', name, slug }],
  });
  if (error || !data) return NextResponse.json({ error: error?.message ?? '创建失败' }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
