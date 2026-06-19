'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Link2, Link2Off } from 'lucide-react';

type Identity = {
  id: string;
  user_id: string;
  identity_id: string;
  provider: string;
  identity_data?: Record<string, unknown>;
}

export default function AccountPage() {
  const t = useTranslations('account');
  const [user, setUser] = useState<any>(null);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const loadUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities((data?.identities ?? []) as Identity[]);
    const res = await fetch('/api/account/has-password');
    const json = await res.json();
    setHasPassword(json.hasPassword);
  };

  useEffect(() => { loadUser(); }, []);

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    setEmailLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (!error) {
      setEmailSent(true);
      setNewEmail('');
      setShowChangeEmail(false);
    }
    setEmailLoading(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError(t('linkedAccounts.passwordMismatch'));
      return;
    }
    setPasswordLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
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

  const handleLink = async (provider: 'google' | 'facebook') => {
    setLinkingProvider(provider);
    const supabase = createClient();
    await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard/profile/account`
      }
    });
    setLinkingProvider(null);
  };

  const handleUnlink = async (identity: Identity) => {
    setUnlinkError('');
    if (identities.length <= 1) {
      setUnlinkError(t('linkedAccounts.unlinkError'));
      return;
    }
    setUnlinkingProvider(identity.provider);
    const supabase = createClient();
    const { error } = await supabase.auth.unlinkIdentity(identity);
    if (error) {
      setUnlinkError(error.message);
    } else {
      await loadUser();
    }
    setUnlinkingProvider(null);
  };

  const isOAuthOnly = identities.length > 0 && !identities.find(i => i.provider === 'email');

  const providers: { key: 'google' | 'facebook'; label: string }[] = [
    { key: 'google', label: t('linkedAccounts.google') },
    { key: 'facebook', label: t('linkedAccounts.facebook') },
  ];

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
              {!emailSent && (
                <button
                  onClick={() => setShowChangeEmail(!showChangeEmail)}
                  className="text-xs font-light"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  {t('linkedAccounts.changeEmail')}
                </button>
              )}
            </div>

            {isOAuthOnly && !user.email && (
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('linkedAccounts.bindEmailHint')}
              </p>
            )}

            {showChangeEmail && !emailSent && (
              <div className="flex flex-col gap-2 pt-1">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder={t('linkedAccounts.newEmailPlaceholder')}
                  className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{
                    background: 'hsl(var(--muted))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowChangeEmail(false); setNewEmail(''); }}
                    className="flex-1 py-2 rounded-xl text-xs font-light"
                    style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
                  >
                    {t('linkedAccounts.cancel')}
                  </button>
                  <button
                    onClick={handleChangeEmail}
                    disabled={!newEmail || emailLoading}
                    className="flex-1 py-2 rounded-xl text-xs font-light disabled:opacity-30"
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                  >
                    {emailLoading ? '...' : t('linkedAccounts.confirm')}
                  </button>
                </div>
              </div>
            )}

            {emailSent && (
              <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('linkedAccounts.emailSent')}
              </p>
            )}
          </div>

          <div style={{ height: 1, background: 'hsl(var(--border))' }} />

          {/* 社交账号绑定 */}
          {unlinkError && (
            <p className="px-4 pt-2 text-xs" style={{ color: 'hsl(var(--destructive))' }}>
              {unlinkError}
            </p>
          )}

          {providers.map((p, i) => {
            const identity = identities.find(id => id.provider === p.key);
            const isLinked = !!identity;
            const isLoadingThis = linkingProvider === p.key || unlinkingProvider === p.key;

            return (
              <div key={p.key}>
                {i > 0 && <div style={{ height: 1, background: 'hsl(var(--border))' }} />}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
                    {p.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {isLinked ? t('linkedAccounts.linked') : t('linkedAccounts.notLinked')}
                    </span>
                    <button
                      onClick={() => isLinked && identity ? handleUnlink(identity) : handleLink(p.key)}
                      disabled={isLoadingThis}
                      className="flex items-center gap-1 text-xs font-light disabled:opacity-30 transition-colors"
                      style={{ color: isLinked ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
                    >
                      {isLoadingThis ? '...' : isLinked
                        ? <><Link2Off size={13} />{t('linkedAccounts.unlink')}</>
                        : <><Link2 size={13} />{t('linkedAccounts.link')}</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

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
