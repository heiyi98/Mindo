'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
];

function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const current = LANGS.find(l => l.code === locale);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          <path d="M2 12h20"/>
        </svg>
        {current?.label}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-full right-0 mt-2 w-40 rounded-2xl overflow-hidden shadow-2xl z-50"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            {LANGS.map(({ code, label }) => (
              <Link
                key={code}
                href="/"
                locale={code as any}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 text-xs transition-colors hover:bg-muted/50"
                style={{
                  color: code === locale
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--muted-foreground))',
                }}
              >
                {label}
                {code === locale && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'hsl(var(--foreground))' }}
                  />
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function LandingContent() {
  const t = useTranslations('landing');
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
    >
      <div className="flex flex-col items-center gap-8 z-10 px-6 text-center">
        <h1
          className="text-6xl md:text-8xl font-light tracking-widest"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          Mindo
        </h1>

        <p
          className="text-base md:text-lg font-light tracking-[0.2em] max-w-md"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {t('slogan')}
        </p>

        <div className="flex flex-col items-center gap-4 mt-4">
          <Link
            href="/onboarding"
            className="px-12 py-4 rounded-full text-base font-medium tracking-[0.15em] transition-all duration-300 hover:opacity-90"
            style={{
              background: 'hsl(var(--foreground))',
              color: 'hsl(var(--background))',
            }}
          >
            {t('startButton')}
          </Link>

          <Link
            href="/auth/login"
            className="text-sm transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {t('loginLink')}
          </Link>
        </div>
      </div>

      <div
        className="absolute top-4 right-4 flex items-center gap-3 z-20"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </div>
  );
}
