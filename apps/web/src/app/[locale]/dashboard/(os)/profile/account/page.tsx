'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { createLoginClient } from '@/lib/supabase/client';

// 账号由 Alethego 统一管理（Mindo 与 TaskApp 共用同一个账号），这里只读显示
// 邮箱，可以修改/设置密码（改的是 Alethego 账号的密码，两个产品同时生效）。
// 换邮箱、绑定/解绑第三方登录不在 Mindo 里提供。
export default function AccountPage() {
  const t = useTranslations('account');
  const [user, setUser] = useState<any>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadUser = async () => {
    const { data: { user } } = await createLoginClient().auth.getUser();
    setUser(user);
    // 用邮箱密码注册过的账号会有一条 provider='email' 的身份记录
    setHasPassword(!!user?.identities?.some(i => i.provider === 'email'));
  };

  useEffect(() => { loadUser(); }, []);

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError(t('linkedAccounts.passwordMismatch'));
      return;
    }
    setPasswordLoading(true);
    const { error } = await createLoginClient().auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setHasPassword(true);
    }
    setPasswordLoading(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1
          className="text-xs font-light tracking-[0.3em] uppercase"
          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
        >
          {t('manageAccount')}
        </h1>
      </motion.div>

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          {/* 邮箱行 */}
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {t('email')}
                </p>
                <p className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
                  {user.email ?? (
                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {t('linkedAccounts.noEmail')}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('linkedAccounts.managedByAlethego')}
            </p>
          </div>

          <div style={{ height: 1, background: 'hsl(var(--border))' }} />

          {/* 密码行 */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {t('linkedAccounts.password')}
                </p>
                <p className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
                  {hasPassword ? t('linkedAccounts.passwordSet') : t('linkedAccounts.passwordNotSet')}
                </p>
              </div>
              <button
                onClick={() => { setShowChangePassword(!showChangePassword); setPasswordError(''); setPasswordSuccess(false); }}
                className="text-xs font-light"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {hasPassword ? t('linkedAccounts.changePassword') : t('linkedAccounts.setPassword')}
              </button>
            </div>

            {passwordSuccess && (
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('linkedAccounts.passwordSuccess')}
              </p>
            )}

            {showChangePassword && (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t('linkedAccounts.newPasswordPlaceholder')}
                  minLength={8}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{
                    background: 'hsl(var(--muted))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('linkedAccounts.confirmPasswordPlaceholder')}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{
                    background: 'hsl(var(--muted))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                {passwordError && (
                  <p className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>{passwordError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowChangePassword(false); setNewPassword(''); setConfirmPassword(''); }}
                    className="flex-1 py-2 rounded-xl text-xs font-light"
                    style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
                  >
                    {t('linkedAccounts.cancel')}
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={!newPassword || !confirmPassword || passwordLoading}
                    className="flex-1 py-2 rounded-xl text-xs font-light disabled:opacity-30"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                  >
                    {passwordLoading ? '...' : t('linkedAccounts.confirm')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
