'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { EntryEditorPanel } from '@/components/admin/codex/EntryEditorPanel';

// 独立路由，方便直接分享/刷新网址进到某个词条的编辑页；工作台里"新建词条"
// 走的是原地切换（不经过这个路由），两处共用同一个EntryEditorPanel组件，
// 只是"返回"的实现不一样——这里是真的路由跳转。
export default function EntryEditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return <EntryEditorPanel entryId={id} onBack={() => router.push('/admin/codex/entries')} />;
}
