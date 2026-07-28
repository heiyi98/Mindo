'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Pencil, GripVertical, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ProfileEditModal from '@/components/dashboard/ProfileEditModal';
import { createClient } from '@/lib/supabase/client';
import { useProfiles, profilesQueryKey, type Profile } from '@/hooks/queries/useProfiles';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function ProfileCardUI({
  profile, 
  onEdit, 
  onDeleteRequest, 
  t, 
  checkingId,
  showGrip = false
}: { 
  profile: Profile; 
  onEdit: () => void; 
  onDeleteRequest?: () => void; 
  t: any;
  checkingId?: string | null;
  showGrip?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex items-center justify-center p-2 ${showGrip ? 'cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground' : 'text-transparent'}`}>
        <GripVertical size={16} />
      </div>

      <div
        className="flex-1 flex items-center justify-between p-4 rounded-2xl transition-shadow"
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
        }}
      >
        <div>
          <div className="text-sm font-light flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
            {profile.display_name}
            {profile.is_self && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'hsl(var(--foreground) / 0.08)',
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                {t('self')}
              </span>
            )}
          </div>
          <div className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {profile.birth_date}
            {/* 分钟是否已知不再影响前端显示，数据库里未知时本来就存的是
                HH:00，统一截取前5位显示即可，不再额外标注"(未知分钟)" */}
            {profile.birth_time ? ` ${profile.birth_time.substring(0, 5)}` : ''}
            {profile.birth_place_name ? ` · ${profile.birth_place_name.split(',')[0]}` : ''}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-2 rounded-lg transition-colors hover:bg-muted/30" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Pencil size={14} />
          </button>
          {!profile.is_self && onDeleteRequest && (
            <button onClick={onDeleteRequest} disabled={checkingId === profile.id} className="p-2 rounded-lg transition-colors hover:bg-destructive/10 disabled:opacity-50" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {checkingId === profile.id ? <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'hsl(var(--muted-foreground))' }} /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableProfileItem({ profile, onEdit, onDeleteRequest, t, checkingId }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: profile.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.8 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <div {...attributes} {...listeners} className="outline-none">
        <ProfileCardUI profile={profile} onEdit={onEdit} onDeleteRequest={onDeleteRequest} t={t} checkingId={checkingId} showGrip={true} />
      </div>
    </div>
  );
}

export default function ProfilesPage() {
  const t = useTranslations('account.profiles');
  const queryClient = useQueryClient();

  // 跟仪表盘/测算中心左上角的档案切换器（经CurrentProfileContext）共用同一份
  // /api/profiles缓存——这里增删改/排序只需要invalidate这一个key，切换器
  // 会自动跟着刷新，不再需要额外手动调用一份"全局refetch"来保持两处同步。
  const { data: rawProfiles = [], isLoading: loading } = useProfiles();
  const profiles = useMemo(() => {
    const list = [...rawProfiles];
    list.sort((a, b) => {
      if (a.is_self) return -1;
      if (b.is_self) return 1;
      return (a.order_index ?? 999) - (b.order_index ?? 999);
    });
    return list;
  }, [rawProfiles]);

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [deleteState, setDeleteState] = useState<{ id: string, name: string, assetCount: number } | null>(null);
  const [checkingDelete, setCheckingDelete] = useState<string | null>(null);

  const supabase = createClient();

  const syncProfiles = () => {
    queryClient.invalidateQueries({ queryKey: profilesQueryKey() });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 拖拽排序：静默保存，不需要用户手动确认。乐观地把新顺序直接写进共享
  // 缓存，PATCH请求在后台跑，跟原有体验一致。
  const reorderMutation = useMutation({
    mutationFn: async (reorderedOthers: Profile[]) => {
      await Promise.all(
        reorderedOthers.map((p, index) =>
          fetch(`/api/profiles/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index: index + 1 }),
          })
        )
      );
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const selfProfile = profiles.find(p => p.is_self);
    const others = profiles.filter(p => !p.is_self);

    const oldIndex = others.findIndex((i) => i.id === active.id);
    const newIndex = others.findIndex((i) => i.id === over.id);
    const newOthers = arrayMove(others, oldIndex, newIndex);

    queryClient.setQueryData(profilesQueryKey(), selfProfile ? [selfProfile, ...newOthers] : newOthers);
    reorderMutation.mutate(newOthers);
  };

  const requestDelete = async (profile: Profile) => {
    setCheckingDelete(profile.id);
    try {
      const { count } = await supabase
        .from('bazi_readings')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profile.id);

      setDeleteState({ id: profile.id, name: profile.display_name, assetCount: count || 0 });
    } catch (e) {
      console.error('Failed to check assets', e);
      setDeleteState({ id: profile.id, name: profile.display_name, assetCount: 0 });
    } finally {
      setCheckingDelete(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      setDeleteState(null);
      syncProfiles();
    },
  });

  const executeDelete = () => {
    if (!deleteState) return;
    deleteMutation.mutate(deleteState.id);
  };

  const selfProfile = profiles.find(p => p.is_self);
  const otherProfiles = profiles.filter(p => !p.is_self);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-4 overflow-hidden">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xs font-light tracking-[0.3em] uppercase mb-6 pl-10" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>
          {t('title')}
        </h1>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }} />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {selfProfile && (
              <ProfileCardUI profile={selfProfile} t={t} onEdit={() => setEditingProfile(selfProfile)} showGrip={false} />
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={otherProfiles.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {otherProfiles.map((profile) => (
                  <SortableProfileItem key={profile.id} profile={profile} t={t} checkingId={checkingDelete} onEdit={() => setEditingProfile(profile)} onDeleteRequest={() => requestDelete(profile)} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="w-[calc(100%-2.5rem)] ml-auto mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-light transition-colors" style={{ border: '1px dashed hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }} onClick={() => setShowCreateModal(true)}>
            <Plus size={14} />{t('add')}
          </motion.button>
        </>
      )}

      <AnimatePresence>
        {deleteState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm p-6 rounded-3xl space-y-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))' }}><AlertTriangle size={18} /></div>
                <h2 className="text-base font-medium" style={{ color: 'hsl(var(--foreground))' }}>{t('deleteConfirmTitle', { defaultMessage: '确认删除' })}</h2>
              </div>
              <div className="text-sm font-light space-y-2 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                <p>确定要永久删除档案 <strong style={{color: 'hsl(var(--foreground))'}}>{deleteState.name}</strong> 吗？</p>
                {deleteState.assetCount > 0 && (
                  <div className="p-3 mt-3 rounded-xl" style={{ background: 'hsl(var(--muted))' }}>
                    <p className="text-xs">⚠️ 发现该档案关联了 <strong style={{color: 'hsl(var(--foreground))'}}>{deleteState.assetCount}</strong> 份已生成的测算资产。<br/><br/>放心，删除档案<strong>不会</strong>导致已购买的报告消失，它们依然存在于你的资产库中。</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDeleteState(null)} disabled={deleteMutation.isPending} className="flex-1 py-3 rounded-xl text-sm font-light" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>{t('cancel')}</button>
                <button onClick={executeDelete} disabled={deleteMutation.isPending} className="flex-1 py-3 rounded-xl text-sm font-light flex justify-center items-center gap-2" style={{ background: 'hsl(var(--destructive))', color: '#ffffff' }}>{deleteMutation.isPending ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.8)' }} /> : <span>确认删除</span>}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {editingProfile && <ProfileEditModal profile={editingProfile} mode="edit" onClose={() => setEditingProfile(null)} onSave={syncProfiles} />}
      {showCreateModal && <ProfileEditModal mode="create" onClose={() => setShowCreateModal(false)} onSave={syncProfiles} />}
    </div>
  );
}