import { NextResponse } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { requireCodexAdmin, isCategoryInScope } from '@/lib/codex/requireCodexAdmin';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  console.log('[categories PATCH] request received');
  const admin = await requireCodexAdmin();
  console.log('[categories PATCH] requireCodexAdmin result:', admin);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: categories } = await codexRepository.listCategories();
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
  if (!isCategoryInScope(id, admin, categoriesById)) {
    return NextResponse.json({ error: '没有权限编辑这个分类' }, { status: 403 });
  }

  const body = (await request.json()) as {
    parentId?: string | null;
    homeEntryId?: string | null;
    translation?: { locale: string; name: string; slug: string };
  };

  if (body.parentId !== undefined) {
    if (body.parentId !== null && !isCategoryInScope(body.parentId, admin, categoriesById)) {
      return NextResponse.json({ error: '没有权限挪到这个上级分类下面' }, { status: 403 });
    }
    // 防止拖拽把一个分类挂到它自己的子孙节点下面，会造成环形结构
    let cursor: string | null = body.parentId;
    while (cursor) {
      if (cursor === id) {
        return NextResponse.json({ error: '不能把一个分类挪到它自己的子分类下面' }, { status: 400 });
      }
      cursor = categoriesById.get(cursor)?.parent_id ?? null;
    }
    const { error } = await codexRepository.updateCategoryParent(id, body.parentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.homeEntryId !== undefined) {
    const { error } = await codexRepository.setCategoryHomeEntry(id, body.homeEntryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.translation) {
    const { locale, name, slug } = body.translation;
    const { error } = await codexRepository.upsertCategoryTranslation(id, locale, { name, slug });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: categories } = await codexRepository.listCategories();
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
  if (!isCategoryInScope(id, admin, categoriesById)) {
    return NextResponse.json({ error: '没有权限删除这个分类' }, { status: 403 });
  }

  const target = categoriesById.get(id);
  if (!target) return NextResponse.json({ error: '分类不存在' }, { status: 404 });

  const { data: counts, error: countError } = await codexRepository.getCategoryChildCounts(id);
  if (countError || !counts) {
    return NextResponse.json({ error: countError?.message ?? '查询失败' }, { status: 500 });
  }

  const hasChildren = counts.childCategories > 0 || counts.entries > 0;

  // 顶层分类（没有parent_id）只要下面还有东西就禁止删除——已跟用户确认的规则，
  // 不做"挪到某个兜底节点"这种变通。
  if (target.parent_id === null && hasChildren) {
    return NextResponse.json(
      { error: '这个顶层分类下还有词条或子分类，无法删除，请先清空里面的内容' },
      { status: 409 }
    );
  }

  // 非顶层分类：下面的词条/子分类自动挪到它的parent_id，再删除自己
  if (hasChildren) {
    if (counts.entries > 0) {
      const { error } = await codexRepository.reassignEntriesCategory(id, target.parent_id!);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (counts.childCategories > 0) {
      const { error } = await codexRepository.reassignChildCategoriesParent(id, target.parent_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error } = await codexRepository.deleteCategory(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
