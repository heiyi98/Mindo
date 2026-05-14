'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Settings, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';

export default function ProfileSwitcher() {
  const t = useTranslations('dashboard.profiles');
  const router = useRouter();
  const { currentProfile, profiles, setCurrentProfile } = useCurrentProfile();
  const [open, setOpen] = useState(false);

  if (!currentProfile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
        style={{
          background: open ? 'hsl(var(--muted))' : 'transparent',
          color: 'hsl(var(--foreground))',
        }}
      >
        <span className="text-sm font-light">{currentProfile.display_name}</span>
        <ChevronDown
          size={14}
          style={{
            color: 'hsl(var(--muted-foreground))',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 200ms',
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-48 rounded-2xl overflow-hidden shadow-2xl z-50"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {profiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => { setCurrentProfile(profile); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors hover:bg-muted/50"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  <div>
                    <div className="font-light">{profile.display_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {profile.birth_date}
                    </div>
                  </div>
                  {profile.id === currentProfile.id && (
                    <Check size={14} style={{ color: 'hsl(var(--foreground))' }} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ height: 1, background: 'hsl(var(--border))' }} />

            <button
              onClick={() => { setOpen(false); router.push('/dashboard/profile/profiles'); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <Settings size={14} />
              {t('manageProfiles')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
