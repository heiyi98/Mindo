'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, MapPin, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import DatePicker from '@/components/onboarding/steps/DatePicker';
import GenderPicker from '@/components/onboarding/steps/GenderPicker';
import TeaserPage from '@/components/onboarding/teaser/TeaserPage';
import TimezoneSelector from '@/components/onboarding/steps/TimezoneSelector';
import { createClient } from '@/lib/supabase/client';
import { matchTimezoneOption, type TimezoneOption } from '@/lib/timezones';
import {
  type OnboardingState,
  EMPTY_ONBOARDING_STATE,
  SESSION_KEY
} from '@/types/onboarding';

type Step = 'date' | 'timecity' | 'gender' | 'teaser' | 'login';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface CityData {
  name: string;
  lat: number;
  lng: number;
  timezone?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('onboarding');
  const tTime = useTranslations('onboarding.timePicker');
  const tCity = useTranslations('onboarding.cityPicker');

  const [step, setStep] = useState<Step>('date');
  const [state, setState] = useState<OnboardingState>(EMPTY_ONBOARDING_STATE);
  const [saving, setSaving] = useState(false);
  const [teaserData, setTeaserData] = useState<{ dayStem: string; energyScores: Record<string, number> } | null>(null);

  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cityError, setCityError] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneOption | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(cityQuery), 500);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim() || selectedCity) {
      setCityResults([]); setIsSearching(false); setCityError(false);
      return;
    }
    const fetchCities = async () => {
      setIsSearching(true); setCityError(false);
      try {
        const res = await fetch(`/api/city-search?q=${encodeURIComponent(debouncedQuery)}&lang=${locale}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCityResults(data.results || []);
      } catch {
        setCityError(true); setCityResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetchCities();
  }, [debouncedQuery, locale, selectedCity]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {}
  }, []);

  const updateState = (updates: Partial<OnboardingState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(newState)); } catch {}
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    updateState({ birthYear: year, birthMonth: month, birthDay: day });
    setStep('timecity');
  };

  const handleCitySelect = (city: CityData) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setCityResults([]);
    if (city.timezone) {
      setSelectedTimezone(matchTimezoneOption(city.timezone));
    }
  };

  const handleTimeCityNext = () => {
    updateState({
      birthHour: hour,
      birthMinute: minute,
      birthLat: selectedCity?.lat ?? null,
      birthLng: selectedCity?.lng ?? null,
      birthPlaceName: selectedCity?.name ?? null,
      birthTimezone: selectedTimezone?.ianaName ?? null,
    });
    setStep('gender');
  };

  const handleGenderSelect = async (gender: 'M' | 'F' | null) => {
    updateState({ gender });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let baziData = null;
    try {
      const currentState = { ...state, gender };
      const reqBody = {
        birthYear: currentState.birthYear,
        birthMonth: currentState.birthMonth,
        birthDay: currentState.birthDay,
        birthHour: currentState.birthHour ?? null,
        birthMinute: currentState.birthMinute ?? null,
        birthLat: currentState.birthLat ?? null,
        birthLng: currentState.birthLng ?? null,
      };
      console.log('[bazi calculate] request:', reqBody);
      const res = await fetch('/api/bazi/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      console.log('[bazi calculate] status:', res.status, res.ok);
      if (res.ok) {
        baziData = await res.json();
        console.log('[bazi calculate] response:', baziData);
        setTeaserData(baziData);
      } else {
        const errBody = await res.text();
        console.error('[bazi calculate] error body:', errBody);
      }
    } catch (err) {
      console.error('[bazi calculate] exception:', err);
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
      const birth_time = (finalState.birthHour !== null && finalState.birthHour !== undefined)
        ? `${String(finalState.birthHour).padStart(2, '0')}:${String(finalState.birthMinute ?? 0).padStart(2, '0')}`
        : null;

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birth_date,
          birth_time: birth_time ?? null,
          birth_lat: finalState.birthLat ?? null,
          birth_lng: finalState.birthLng ?? null,
          birth_place_name: finalState.birthPlaceName ?? null,
          birth_timezone: finalState.birthTimezone ?? null,
          gender: finalState.gender ?? null,
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

  const TimeCityStep = (
    <div className="text-center max-w-md mx-auto w-full">
      <motion.h2
        className="text-2xl md:text-3xl font-light mb-4"
        style={{ color: 'hsl(var(--foreground))' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {t('timecity.title')}
      </motion.h2>
      <motion.p
        className="text-sm mb-8"
        style={{ color: 'hsl(var(--muted-foreground))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {t('timecity.description')}
      </motion.p>

      {/* 小时选择 */}
      <div className="mb-4 w-full">
        <label className="block text-sm mb-2 text-left px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {tTime('hourLabel')}
        </label>
        <div className="relative">
          <select
            value={hour ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              const newH = val === '' ? null : Number(val);
              setHour(newH);
              if (newH === null) setMinute(null);
            }}
            className="w-full appearance-none px-6 py-4 pr-12 rounded-2xl text-lg font-medium cursor-pointer focus:outline-none"
            style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))' }}
          >
            <option value="" style={{ color: 'hsl(var(--muted-foreground))' }}>{tTime('hourPlaceholder')}</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'hsl(var(--muted-foreground))' }} />
        </div>
      </div>

      {/* 分钟选择（填写小时后出现） */}
      <AnimatePresence>
        {hour !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 w-full overflow-hidden"
          >
            <div className="pt-2">
              <label className="block text-sm mb-2 text-left px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {tTime('minuteLabel')}
              </label>
              <div className="relative">
                <select
                  value={minute ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMinute(val === '' ? null : Number(val));
                  }}
                  className="w-full appearance-none px-6 py-4 pr-12 rounded-2xl text-lg font-medium cursor-pointer focus:outline-none"
                  style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))' }}
                >
                  <option value="">{tTime('minutePlaceholder')}</option>
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'hsl(var(--muted-foreground))' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 城市搜索 */}
      <div className="mb-4 w-full">
        <label className="block text-sm mb-2 text-left px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {tCity('label')}
        </label>
        <div className="relative">
          {selectedCity
            ? <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'hsl(var(--foreground))' }} />
            : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'hsl(var(--muted-foreground))' }} />
          }
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => {
              if (selectedCity) { setSelectedCity(null); setSelectedTimezone(null); }
              setCityQuery(e.target.value);
            }}
            placeholder={tCity('placeholder')}
            className="w-full rounded-2xl py-4 pl-12 pr-12 outline-none transition-all"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(var(--glass-blur))',
              color: 'hsl(var(--foreground))',
            }}
          />
          {isSearching && !selectedCity && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" style={{ color: 'hsl(var(--foreground))' }} />
          )}
          {selectedCity && (
            <button
              onClick={() => { setSelectedCity(null); setSelectedTimezone(null); setCityQuery(''); }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5" style={{ color: 'hsl(var(--muted-foreground))' }} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {!selectedCity && (cityResults.length > 0 || (cityQuery && !isSearching && cityResults.length === 0) || cityError) && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="relative left-0 right-0 rounded-2xl overflow-hidden shadow-2xl z-50 mt-2"
              style={{ background: 'hsl(var(--card))', border: '1px solid var(--glass-border)' }}
            >
              {cityError ? (
                <div className="p-4 text-center text-sm flex items-center justify-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                  <AlertCircle className="w-4 h-4" />{tCity('error')}
                </div>
              ) : cityResults.length === 0 && cityQuery && !isSearching ? (
                <div className="p-4 text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{tCity('noResults')}</div>
              ) : (
                <ul className="max-h-60 overflow-y-auto py-2 text-left">
                  {cityResults.map((city, idx) => (
                    <li
                      key={`${city.lat}-${city.lng}-${idx}`}
                      onClick={() => handleCitySelect(city)}
                      className="px-4 py-3 cursor-pointer flex items-start gap-3 transition-colors"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium line-clamp-1">{city.name.split(',')[0]}</span>
                        <span className="text-xs line-clamp-1 mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{city.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 时区选择器（选完城市后出现） */}
      <AnimatePresence>
        {selectedTimezone && (
          <TimezoneSelector
            selectedIana={selectedTimezone.ianaName}
            onChange={(tz) => setSelectedTimezone(tz)}
          />
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={handleTimeCityNext}
        className="w-full mt-8 px-12 py-4 text-base font-medium rounded-full hover:opacity-90 transition-all duration-300"
        style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
      >
        {t('timecity.next')}
      </motion.button>
    </div>
  );

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

          {step === 'timecity' && (
            <motion.div
              key="timecity"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              {TimeCityStep}
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

          {step === 'teaser' && (
            teaserData ? (
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
            ) : (
              <motion.div
                key="teaser-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-[60vh]"
              >
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(var(--foreground))' }} />
              </motion.div>
            )
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
          <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ color: 'hsl(var(--foreground))' }}>...</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoginStep({ onSuccess }: { onSuccess: () => void }) {
  return <LoginFormWithCallback onSuccess={onSuccess} />;
}

function LoginFormWithCallback({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') onSuccess();
    });
    return () => subscription.unsubscribe();
  }, [onSuccess]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
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
          style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}
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
