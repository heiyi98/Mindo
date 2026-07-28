'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUserByHandle } from '@/hooks/queries/useUserByHandle';
import { useFollowStatus, followStatusQueryKey, type FollowStatus } from '@/hooks/queries/useFollowStatus';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const handle = params.handle as string;
  const locale = params.locale as string;
  const t = useTranslations('social');

  // 未登录直接跳去登录页——这是一道认证门禁，不是"数据"，保持简单的
  // 挂载时检查，不需要用查询机制包一层。
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(`/${locale}/auth/login`);
        return;
      }
      setAuthChecked(true);
    });
  }, [locale, router]);

  // 跟片语个人页共用同一份/api/users/:handle缓存。
  const { data: targetData, isLoading: targetLoading } = useUserByHandle(handle);
  const target = targetData?.user ?? null;
  const notFound = authChecked && !targetLoading && !target;

  // 跟片语个人页共用同一份/api/follows/status缓存。
  const { data: status } = useFollowStatus(target?.id, authChecked);

  const loading = !authChecked || targetLoading;

  const toggleFollowMutation = useMutation({
    mutationFn: async (vars: { targetId: string; wasFollowing: boolean }) => {
      const res = await fetch('/api/follows', {
        method: vars.wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: vars.targetId }),
      });
      if (!res.ok) throw new Error('request failed');
    },
    onMutate: async (vars) => {
      const key = followStatusQueryKey(vars.targetId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FollowStatus>(key);
      queryClient.setQueryData(key, (old: FollowStatus | undefined) =>
        old ? { ...old, iFollow: !vars.wasFollowing } : old
      );
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) queryClient.setQueryData(followStatusQueryKey(vars.targetId), context.previous);
    },
  });

  const handleToggleFollow = () => {
    if (!target || !status || toggleFollowMutation.isPending) return;
    toggleFollowMutation.mutate({ targetId: target.id, wasFollowing: status.iFollow });
  };

  const messageMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      if (!res.ok) throw new Error('request failed');
      return res.json() as Promise<{ conversationId: string }>;
    },
    onSuccess: (data) => {
      router.push(`/${locale}/dashboard/messages?conv=${data.conversationId}`);
    },
  });

  const handleMessage = () => {
    if (!target || messageMutation.isPending) return;
    messageMutation.mutate(target.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-sm font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
          ...
        </span>
      </div>
    );
  }

  if (notFound || !target) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-sm font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('notFound')}
        </span>
      </div>
    );
  }

  const isFriend = status?.iFollow && status?.theyFollow;

  return (
    <div className="min-h-screen flex items-start justify-center pt-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* 头像 */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-light"
          style={{
            background: 'hsl(var(--muted))',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          {target.display_name?.[0]?.toUpperCase() ?? target.handle[6]?.toUpperCase() ?? '?'}
        </div>

        {/* 昵称 + handle */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-light" style={{ color: 'hsl(var(--foreground))' }}>
            {target.display_name ?? t('noName')}
          </h1>
          <p className="text-sm font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
            @{target.handle}
          </p>
          {isFriend && (
            <p className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('mutualFollow')}
            </p>
          )}
        </div>

        {/* 操作按钮（自己主页不显示） */}
        {status && !status.isSelf && (
          <div className="flex gap-3">
            {/* 关注按钮 */}
            <button
              onClick={handleToggleFollow}
              disabled={toggleFollowMutation.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-light transition-all disabled:opacity-50"
              style={status.iFollow
                ? {
                    background: 'hsl(var(--muted))',
                    color: 'hsl(var(--muted-foreground))',
                    border: '1px solid hsl(var(--border))',
                  }
                : {
                    background: 'hsl(var(--foreground))',
                    color: 'hsl(var(--background))',
                  }
              }
            >
              {toggleFollowMutation.isPending
                ? '...'
                : status.iFollow
                  ? t('following')
                  : status.theyFollow
                    ? t('followBack')
                    : t('follow')
              }
            </button>

            {/* 发消息按钮 */}
            <button
              onClick={handleMessage}
              disabled={messageMutation.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-light transition-all disabled:opacity-50"
              style={{
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              {messageMutation.isPending ? '...' : t('sendMessage')}
            </button>
          </div>
        )}

        {/* 自己主页提示 */}
        {status?.isSelf && (
          <p className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {t('thisIsYou')}
          </p>
        )}
      </motion.div>
    </div>
  );
}
