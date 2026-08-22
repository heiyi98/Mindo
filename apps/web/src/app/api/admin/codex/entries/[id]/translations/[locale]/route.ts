import { NextResponse } from 'next/server';
import { codexRepository } from '@/lib/codex/adminClient';
import { requireCodexAdmin, isCategoryInScope } from '@/lib/codex/requireCodexAdmin';
import type { CodexEntryStatus } from '@mindo/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; locale: string }> }
) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, locale } = await params;
  const { data: translations, error } = await codexRepository.getEntryTranslations(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const translation = translations.find((t) => t.locale === locale) ?? null;
  const citations = translation
    ? (await codexRepository.listCitations(translation.id)).data
    : [];

  return NextResponse.json({ translation, citations });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; locale: string }> }
) {
  const admin = await requireCodexAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, locale } = await params;
  const { data: entry, error: entryError } = await codexRepository.getEntry(id);
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 });
  if (!entry) return NextResponse.json({ error: '词条不存在' }, { status: 404 });

  const { data: categories } = await codexRepository.listCategories();
  const categoriesById = new Map((categories ?? []).map((c) => [c.id, c]));
  if (!isCategoryInScope(entry.category_id, admin, categoriesById)) {
    return NextResponse.json({ error: '没有权限编辑这个词条' }, { status: 403 });
  }

  const body = (await request.json()) as {
    title?: string;
    body?: Record<string, unknown>;
    status?: CodexEntryStatus;
    citations?: { title: string; url: string | null }[];
  };

  const title = (body.title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
  }
  const status: CodexEntryStatus = body.status === 'published' ? 'published' : 'draft';

  const { data: translation, error } = await codexRepository.upsertEntryTranslation(id, locale, {
    title,
    body: body.body ?? { type: 'doc', content: [] },
    status,
  });
  if (error || !translation) {
    return NextResponse.json({ error: error?.message ?? '保存失败' }, { status: 500 });
  }

  const { error: citationsError } = await codexRepository.replaceCitations(
    translation.id,
    body.citations ?? []
  );
  if (citationsError) {
    return NextResponse.json({ error: citationsError.message }, { status: 500 });
  }

  if (status === 'published') {
    await codexRepository.markEntryPublishedAt(id);
  }

  return NextResponse.json({ translation });
}
