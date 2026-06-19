'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Trash2, ChevronRight, Package, Shield } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LanguageSettingRow } from '@/components/os/LanguageSwitcher';

export default function ProfilePage() {
  const t = useTranslations('account');
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
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
