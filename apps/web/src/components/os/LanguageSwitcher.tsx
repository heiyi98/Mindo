'use client';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(!open);
  };

  const handleSwitch = async (newLocale: string) => {
    setOpen(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ language_preference: newLocale })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Failed to update language preference:', err);
    }
    router.replace(pathname, { locale: newLocale });
  };

  const current = SUPPORTED_LOCALES.find(l => l.code === locale);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <Globe size={14} />
        <span className="text-xs">{current?.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-40 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              right: menuPosition.right,
              zIndex: 9999,
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            {SUPPORTED_LOCALES.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => handleSwitch(code)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors"
                style={{
                  color: code === locale
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--muted) / 0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {label}
                {code === locale && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'hsl(var(--foreground))' }}
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />}
    </div>
  );
}

export function LanguageSettingRow({ label }: { label: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const current = SUPPORTED_LOCALES.find(l => l.code === locale);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(!open);
  };

  const handleSwitch = async (newLocale: string) => {
    setOpen(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ language_preference: newLocale })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Failed to update language preference:', err);
    }
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-4 py-4 transition-colors hover:bg-muted/30"
        style={{ cursor: 'pointer' }}
      >
        <div className="flex items-center gap-2">
          <Globe size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <span className="text-sm font-light" style={{ color: 'hsl(var(--foreground))' }}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <Globe size={14} />
          <span className="text-xs">{current?.label}</span>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              right: menuPosition.right,
              zIndex: 9999,
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              minWidth: 160,
            }}
          >
            {SUPPORTED_LOCALES.map(({ code, label: optLabel }) => (
              <button
                key={code}
                onClick={() => handleSwitch(code)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm"
                style={{
                  cursor: 'pointer',
                  color: code === locale
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--muted-foreground))',
                  background: 'transparent',
                  display: 'flex',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--muted) / 0.5)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {optLabel}
                {code === locale && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(var(--foreground))' }} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
