'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Trash2, ChevronRight, Package, Shield, Copy, Check, Pencil } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LanguageSettingRow } from '@/components/os/LanguageSwitcher';

export default function ProfilePage() {
  const t = useTranslations('account');
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 编辑弹窗状态
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('users')
        .select('handle, display_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setHandle(data.handle ?? null);
            setDisplayName(data.display_name ?? null);
          }
        });
    });
  }, []);

  const openEdit = () => {
    setEditName(displayName ?? '');
    setEditHandle(handle ?? '');
    setEditError(null);
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (saving) return;
    setSaving(true);
    setEditError(null);

    const body: Record<string, string> = {};
    if (editName.trim() !== (displayName ?? '')) body.display_name = editName.trim();
    if (editHandle.trim().toLowerCase() !== (handle ?? '')) body.handle = editHandle.trim().toLowerCase();

    if (Object.keys(body).length === 0) {
      setShowEdit(false);
      setSaving(false);
      return;
    }

    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMap: Record<string, string> = {
        handle_invalid: t('identity.handleInvalid'),
        handle_taken: t('identity.handleTaken'),
        display_name_too_long: t('identity.nameTooLong'),
      };
      setEditError(errorMap[data.error] ?? t('identity.saveFailed'));
      setSaving(false);
      return;
    }

    if (data.updates.display_name !== undefined) setDisplayName(data.updates.display_name || null);
    if (data.updates.handle !== undefined) setHandle(data.updates.handle);
    setShowEdit(false);
    setSaving(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCopy = () => {
    if (!handle) return;
    const url = `${window.location.origin}/u/${handle}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      if (res.ok) router.push('/');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1
          className="text-xs font-light tracking-[0.3em] uppercase"
          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
        >
          {t('title')}
        </h1>
      </motion.div>

      {/* 个人身份卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl px-5 py-5 flex items-center gap-4"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        {/* 头像占位 */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-light flex-shrink-0"
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
        >
          {displayName?.[0]?.toUpperCase() ?? handle?.[6]?.toUpperCase() ?? '?'}
        </div>

        {/* 昵称 + handle */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-light truncate" style={{ color: 'hsl(var(--foreground))' }}>
            {displayName ?? t('identity.noName')}
          </p>
          <p className="text-xs font-light mt-0.5 truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {handle ? `@${handle}` : '—'}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-light transition-colors"
            style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
          >
            <Pencil size={12} />
            {t('identity.edit')}
          </button>
          <button
            onClick={handleCopy}
            disabled={!handle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-light transition-colors disabled:opacity-30"
            style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
          >
            {copied ? <><Check size={12} />{t('identity.copied')}</> : <><Copy size={12} />{t('identity.copyLink')}</>}
          </button>
        </div>
      </motion.div>

      {/* 导航区块 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <Link
          href="/dashboard/profile/profiles"
          className="w-full flex items-center justify-between px-4 py-4 transition-colors hover:bg-muted/30"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <span className="text-sm font-light">{t('manageProfiles')}</span>
          <ChevronRight size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
        </Link>
        <div style={{ height: 1, background: 'hsl(var(--border))' }} />
        <Link
          href="/dashboard/profile/account"
          className="w-full flex items-center justify-between px-4 py-4 transition-colors hover:bg-muted/30"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
            <span className="text-sm font-light">{t('manageAccount')}</span>
          </div>
          <ChevronRight size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
        </Link>
        <div style={{ height: 1, background: 'hsl(var(--border))' }} />
        <LanguageSettingRow label={t('language')} />
        <div style={{ height: 1, background: 'hsl(var(--border))' }} />
        <Link
          href="/dashboard/profile/assets"
          className="w-full flex items-center justify-between px-4 py-4 transition-colors hover:bg-muted/30"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <div className="flex items-center gap-2">
            <Package size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
            <span className="text-sm font-light">{t('assetsLabel')}</span>
          </div>
          <ChevronRight size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
        </Link>
      </motion.div>

      {/* 危险操作区块 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      >
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 text-sm font-light transition-colors hover:bg-muted/30"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          <LogOut size={16} />
          {t('signOut')}
        </button>
        <div style={{ height: 1, background: 'hsl(var(--border))' }} />
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-4 text-sm font-light transition-colors hover:bg-destructive/10"
          style={{ color: 'hsl(var(--destructive))' }}
        >
          <Trash2 size={16} />
          {t('deleteAccount')}
        </button>
      </motion.div>

      {/* 编辑身份弹窗 */}
      {showEdit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowEdit(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm p-6 rounded-3xl space-y-4"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-light" style={{ color: 'hsl(var(--foreground))' }}>
              {t('identity.editTitle')}
            </h2>

            {/* 昵称 */}
            <div className="space-y-1.5">
              <label className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('identity.nameLabel')}
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t('identity.namePlaceholder')}
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl text-sm font-light focus:outline-none"
                style={{
                  background: 'hsl(var(--muted))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
            </div>

            {/* Handle */}
            <div className="space-y-1.5">
              <label className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('identity.handleLabel')}
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-light select-none"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  @
                </span>
                <input
                  type="text"
                  value={editHandle}
                  onChange={e => setEditHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_handle"
                  maxLength={30}
                  className="w-full pl-8 pr-4 py-3 rounded-xl text-sm font-light focus:outline-none"
                  style={{
                    background: 'hsl(var(--muted))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
              </div>
              <p className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('identity.handleHint')}
              </p>
            </div>

            {/* 错误提示 */}
            {editError && (
              <p className="text-xs font-light" style={{ color: 'hsl(var(--destructive))' }}>
                {editError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowEdit(false)}
                className="flex-1 py-3 rounded-xl text-sm font-light"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editHandle.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-light disabled:opacity-30"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
              >
                {saving ? '...' : t('identity.save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 注销确认弹窗 */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm p-6 rounded-3xl space-y-4"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <h2 className="text-base font-light" style={{ color: 'hsl(var(--foreground))' }}>
              {t('deleteConfirmTitle')}
            </h2>
            <p className="text-sm font-light leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('deleteConfirmDesc')}
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
              style={{
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-light"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 py-3 rounded-xl text-sm font-light disabled:opacity-30"
                style={{ background: 'hsl(var(--destructive))', color: '#ffffff' }}
              >
                {deleting ? '...' : t('confirmDelete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}