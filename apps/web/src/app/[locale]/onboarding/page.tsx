'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from '@/components/onboarding/steps/DatePicker';
import TimePicker from '@/components/onboarding/steps/TimePicker';
import CityPicker from '@/components/onboarding/steps/CityPicker';
import GenderPicker from '@/components/onboarding/steps/GenderPicker';
import TeaserPage from '@/components/onboarding/teaser/TeaserPage';
import { createClient } from '@/lib/supabase/client';
import {
  type OnboardingState,
  EMPTY_ONBOARDING_STATE,
  SESSION_KEY
} from '@/types/onboarding';

type Step = 'date' | 'time' | 'city' | 'gender' | 'teaser' | 'login';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('date');
  const [state, setState] = useState<OnboardingState>(EMPTY_ONBOARDING_STATE);
  const [saving, setSaving] = useState(false);
  const [teaserData, setTeaserData] = useState<{ dayStem: string; energyScores: Record<string, number> } | null>(null);

  // 读取sessionStorage里已有的数据（用户刷新页面时恢复）
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // 每次state变化时保存到sessionStorage
  const updateState = (updates: Partial<OnboardingState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newState));
    } catch {}
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    updateState({ birthYear: year, birthMonth: month, birthDay: day });
    setStep('time');
  };

  const handleTimeSelect = (hour: number | null, minute: number | null) => {
    updateState({ birthHour: hour, birthMinute: minute });
    setStep('city');
  };

  const handleCitySelect = (cityData: { name: string; lat: number; lng: number } | null) => {
    updateState({
      birthLat: cityData?.lat ?? null,
      birthLng: cityData?.lng ?? null,
      birthPlaceName: cityData?.name ?? null,
    });
    setStep('gender');
  };

  const handleGenderSelect = async (gender: 'M' | 'F' | null) => {
    updateState({ gender });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 先计算八字数据
    try {
      const currentState = { ...state, gender };
      const res = await fetch('/api/bazi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthYear: currentState.birthYear,
          birthMonth: currentState.birthMonth,
          birthDay: currentState.birthDay,
          birthHour: currentState.birthHour,
          birthMinute: currentState.birthMinute,
          birthLat: currentState.birthLat,
          birthLng: currentState.birthLng,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTeaserData(data);
      }
    } catch (err) {
      console.error('Bazi calculation error:', err);
    }

    if (user) {
      await saveToDatabase({ ...state, gender });
    } else {
      setStep('teaser');
    }
  };

  const saveToDatabase = async (finalState: OnboardingState) => {
    setSaving(true);
    try {
      const birth_date = `${finalState.birthYear}-${String(finalState.birthMonth).padStart(2, '0')}-${String(finalState.birthDay).padStart(2, '0')}`;
      const birth_time = finalState.birthHour !== null && finalState.birthMinute !== null
        ? `${String(finalState.birthHour).padStart(2, '0')}:${String(finalState.birthMinute).padStart(2, '0')}`
        : null;

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth_date,
          birth_time,
          birth_lat: finalState.birthLat,
          birth_lng: finalState.birthLng,
          birth_place_name: finalState.birthPlaceName,
          gender: finalState.gender,
        }),
      });

      if (res.ok) {
        sessionStorage.removeItem(SESSION_KEY);
        router.push('/dashboard');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoginSuccess = async () => {
    await saveToDatabase(state);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'hsl(var(--background))' }}
    >
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">
          {step === 'date' && (
            <motion.div
              key="date"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <DatePicker onSelect={handleDateSelect} />
            </motion.div>
          )}

          {step === 'time' && (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <TimePicker onSelect={handleTimeSelect} />
            </motion.div>
          )}

          {step === 'city' && (
            <motion.div
              key="city"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <CityPicker onSelect={handleCitySelect} />
            </motion.div>
          )}

          {step === 'gender' && (
            <motion.div
              key="gender"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <GenderPicker onSelect={handleGenderSelect} />
            </motion.div>
          )}

          {step === 'teaser' && teaserData && (
            <motion.div
              key="teaser"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="fixed inset-0 overflow-y-auto"
            >
              <TeaserPage
                baziData={teaserData}
                onLogin={() => setStep('login')}
              />
            </motion.div>
          )}

          {step === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <LoginStep onSuccess={handleLoginSuccess} />
            </motion.div>
          )}
        </AnimatePresence>

        {saving && (
          <div className="fixed inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ color: 'hsl(var(--foreground))' }}>...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Teaser占位（下一阶段实现完整预览）
function TeaserPlaceholder({ onLogin }: { onLogin: () => void }) {
  const t = useTranslations('onboarding');
  return (
    <div className="text-center py-12">
      <p className="text-lg mb-8" style={{ color: 'hsl(var(--foreground))' }}>
        {t('teaserPlaceholder')}
      </p>
      <button
        onClick={onLogin}
        className="px-12 py-4 rounded-full font-medium"
        style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
      >
        {t('loginToSave')}
      </button>
    </div>
  );
}

// 登录步骤（复用LoginForm）
function LoginStep({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div>
      <LoginFormWithCallback onSuccess={onSuccess} />
    </div>
  );
}

// LoginForm的回调版本
function LoginFormWithCallback({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // 监听登录状态变化
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        onSuccess();
      }
    });
    return () => subscription.unsubscribe();
  }, [onSuccess]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/confirm?next=/onboarding` }
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding` }
    });
    setGoogleLoading(false);
  };

  if (sent) {
    return <div className="text-center" style={{ color: 'hsl(var(--foreground))' }}><p>{t('login.checkEmail')}</p></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-3 disabled:opacity-50 transition-colors"
        style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? t('login.sending') : t('login.continueWithGoogle')}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }}/>
        <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('login.or')}</span>
        <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }}/>
      </div>

      <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('login.emailPlaceholder')}
          required
          className="w-full px-4 py-3 rounded-lg focus:outline-none"
          style={{
            background: 'hsl(var(--muted))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))'
          }}
        />
        {error && <p className="text-sm" style={{ color: 'hsl(var(--destructive))' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-medium disabled:opacity-50"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          {loading ? t('login.sending') : t('login.sendLink')}
        </button>
      </form>
    </div>
  );
}
