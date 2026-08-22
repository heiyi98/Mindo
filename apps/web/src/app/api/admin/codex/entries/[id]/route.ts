import { NextResponse } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { requireCodexAdmin, isCategoryInScope } from '@/lib/codex/requireCodexAdmin';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: entry, error: entryError } = await codexRepository.getEntry(id);
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 });
  if (!entry) return NextResponse.json({ error: '词条不存在' }, { status: 404 });

  const { data: categories } = await codexRepository.listCategories();
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
  if (!isCategoryInScope(entry.category_id, admin, categoriesById)) {
    return NextResponse.json({ error: '没有权限查看这个词条' }, { status: 403 });
  }

  const { data: translations, error: trError } = await codexRepository.getEntryTranslations(id);
  if (trError) return NextResponse.json({ error: trError.message }, { status: 500 });

  return NextResponse.json({ entry, translations });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: entry, error: entryError } = await codexRepository.getEntry(id);
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 });
  if (!entry) return NextResponse.json({ error: '词条不存在' }, { status: 404 });

  const { data: categories } = await codexRepository.listCategories();
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
  if (!isCategoryInScope(entry.category_id, admin, categoriesById)) {
    return NextResponse.json({ error: '没有权限移动这个词条' }, { status: 403 });
  }

  const body = (await request.json()) as { categoryId?: string | null; slug?: string };

  if (body.categoryId !== undefined) {
    // categoryId为null＝把词条挪成不归属任何分类的顶层词条，只有超级管理员能做，
    // 跟"新建顶层词条"是同一条规则，见 entries/route.ts POST。
    if (body.categoryId === null && !admin.isSuperAdmin) {
      return NextResponse.json({ error: '没有权限把词条挪出所有分类' }, { status: 403 });
    }
    if (body.categoryId !== null && !isCategoryInScope(body.categoryId, admin, categoriesById)) {
      return NextResponse.json({ error: '没有权限挪到这个归类下面' }, { status: 403 });
    }
    const { error } = await codexRepository.updateEntryCategory(id, body.categoryId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim();
    if (!slug) return NextResponse.json({ error: '路径标识不能为空' }, { status: 400 });
    const { error } = await codexRepository.updateEntrySlug(id, slug);
    if (error) {
      // 最可能的失败原因：这个路径标识已经被别的词条占用了（entries.slug全局唯一）
      const message = error.message.includes('duplicate key')
        ? '这个路径标识已经被别的词条占用，换一个'
        : error.message;
      return NextResponse.json({ error: message }, { status: error.message.includes('duplicate key') ? 409 : 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: entry, error: entryError } = await codexRepository.getEntry(id);
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 });
  if (!entry) return NextResponse.json({ error: '词条不存在' }, { status: 404 });

  const { data: categories } = await codexRepository.listCategories();
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
  if (!isCategoryInScope(entry.category_id, admin, categoriesById)) {
    return NextResponse.json({ error: '没有权限删除这个词条' }, { status: 403 });
  }

  const { error } = await codexRepository.deleteEntry(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
