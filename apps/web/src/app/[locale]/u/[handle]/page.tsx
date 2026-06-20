'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface TargetUser {
  id: string;
  handle: string;
  display_name: string | null;
}

interface FollowStatus {
  isSelf: boolean;
  iFollow: boolean;
  theyFollow: boolean;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handle = params.handle as string;
  const locale = params.locale as string;
  const t = useTranslations('social');

  const [target, setTarget] = useState<TargetUser | null>(null);
  const [status, setStatus] = useState<FollowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/${locale}/auth/login`);
        return;
      }

      const res = await fetch(`/api/users/${handle}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { user: targetUser } = await res.json();
      setTarget(targetUser);

      const statusRes = await fetch(`/api/follows/status?targetId=${targetUser.id}`);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
      setLoading(false);
    };
    init();
  }, [handle, locale, router]);

  const handleToggleFollow = async () => {
    if (!target || !status || toggling) return;
    setToggling(true);

    const method = status.iFollow ? 'DELETE' : 'POST';
    const res = await fetch('/api/follows', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: target.id }),
    });

    if (res.ok) {
      setStatus(prev => prev ? { ...prev, iFollow: !prev.iFollow } : prev);
    }
    setToggling(false);
  };

  const handleMessage = async () => {
    if (!target || messaging) return;
    setMessaging(true);

    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: target.id }),
    });

    if (res.ok) {
      const { conversationId } = await res.json();
      router.push(`/${locale}/dashboard/messages?conv=${conversationId}`);
    }
    setMessaging(false);
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
              disabled={toggling}
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
              {toggling
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
              disabled={messaging}
              className="px-6 py-2.5 rounded-xl text-sm font-light transition-all disabled:opacity-50"
              style={{
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              {messaging ? '...' : t('sendMessage')}
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