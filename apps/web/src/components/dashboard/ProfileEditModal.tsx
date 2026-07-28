'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DatePicker from '@/components/onboarding/steps/DatePicker';
import TimePicker from '@/components/onboarding/steps/TimePicker';
import CityPicker from '@/components/onboarding/steps/CityPicker';
import TimezoneSelector from '@/components/onboarding/steps/TimezoneSelector';
import { matchTimezoneOption, findTimezoneByIana, type TimezoneOption } from '@/lib/timezones';

interface ProfileEditModalProps {
  profile?: {
    id: string;
    display_name: string;
    birth_date: string;
    birth_time: string | null;
    birth_place_name: string | null;
    birth_lat?: number | null;
    birth_lng?: number | null;
    birth_timezone?: string | null;
    gender?: 'M' | 'F' | null;
    is_self: boolean;
    is_minute_unknown?: boolean;
  };
  onClose: () => void;
  onSave: () => void;
  mode: 'create' | 'edit';
}

const Divider = () => <div style={{ height: 1, background: 'hsl(var(--border))' }} />;

export default function ProfileEditModal({ profile, onClose, onSave, mode }: ProfileEditModalProps) {
  const t = useTranslations('account.profileModal');
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [birthYear, setBirthYear] = useState<number | null>(profile?.birth_date ? parseInt(profile.birth_date.split('-')[0]) : null);
  const [birthMonth, setBirthMonth] = useState<number | null>(profile?.birth_date ? parseInt(profile.birth_date.split('-')[1]) : null);
  const [birthDay, setBirthDay] = useState<number | null>(profile?.birth_date ? parseInt(profile.birth_date.split('-')[2]) : null);

  const [birthHour, setBirthHour] = useState<number | null>(profile?.birth_time ? parseInt(profile.birth_time.split(':')[0]) : null);
  
  // 核心逻辑：向数据库妥协后，数据库会返回 "21:00:00"，我们通过 is_minute_unknown 标记强制让分钟为 null 
  const [birthMinute, setBirthMinute] = useState<number | null>(
    (profile?.birth_time && !profile.is_minute_unknown) 
      ? parseInt(profile.birth_time.split(':')[1]) 
      : null
  );

  const [birthLat, setBirthLat] = useState<number | null>(profile?.birth_lat ?? null);
  const [birthLng, setBirthLng] = useState<number | null>(profile?.birth_lng ?? null);
  const [birthPlaceName, setBirthPlaceName] = useState<string | null>(profile?.birth_place_name || null);
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneOption | null>(
    profile?.birth_timezone ? (findTimezoneByIana(profile.birth_timezone) ?? matchTimezoneOption(profile.birth_timezone)) : null
  );
  const [gender, setGender] = useState<'M' | 'F' | null>(profile?.gender ?? null);

  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = mode === 'create'
        ? await fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/profiles/${profile!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
      if (!res.ok) throw new Error('request failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      onSave();
      onClose();
    },
  });

  const handleSave = () => {
    if (!displayName || !birthYear || !birthMonth || !birthDay) return;

    const birth_date = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    let birth_time = null;
    let is_minute_unknown = false;

    if (birthHour !== null) {
      if (birthMinute !== null) {
        birth_time = `${String(birthHour).padStart(2, '0')}:${String(birthMinute).padStart(2, '0')}`;
      } else {
        // 向数据库妥协：即使未知分钟，也拼接 :00 发给数据库防报错，全靠标记区分
        birth_time = `${String(birthHour).padStart(2, '0')}:00`;
        is_minute_unknown = true;
      }
    }

    if (mode === 'edit' && !profile) return;

    saveMutation.mutate({
      display_name: displayName,
      birth_date,
      birth_time,
      is_minute_unknown, // 传递精神标记
      birth_lat: birthLat,
      birth_lng: birthLng,
      birth_place_name: birthPlaceName,
      birth_timezone: selectedTimezone?.ianaName ?? null,
      gender,
    });
  };

  const canSave = displayName && birthYear && birthMonth && birthDay;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', maxHeight: '90vh' }}>
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <h2 className="text-sm font-light tracking-wider" style={{ color: 'hsl(var(--foreground))' }}>{mode === 'create' ? t('createTitle') : t('editTitle')}</h2>
            <button onClick={onClose}><X size={16} style={{ color: 'hsl(var(--muted-foreground))' }} /></button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs mb-2 tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('name')}</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={t('namePlaceholder')} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }} />
              </div>
              <Divider />
              <div>
                <label className="block text-xs mb-3 tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('birthDate')}</label>
                <DatePicker hideConfirm={true} autoConfirm={true} initialYear={birthYear ?? undefined} initialMonth={birthMonth ?? undefined} initialDay={birthDay ?? undefined} onSelect={(y, m, d) => { setBirthYear(y); setBirthMonth(m); setBirthDay(d); }} />
              </div>
              <Divider />
              <div>
                <label className="block text-xs mb-3 tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('birthTime')}</label>
                <TimePicker hideConfirm={true} autoConfirm={true} initialHour={birthHour} initialMinute={birthMinute} onSelect={(h, m) => { setBirthHour(h); setBirthMinute(m); }} />
              </div>
              <Divider />
              <div>
                <label className="block text-xs mb-3 tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('birthCity')}</label>
                <CityPicker hideTitle={true} hideConfirm={true} initialCity={birthPlaceName && birthLat && birthLng ? { name: birthPlaceName, lat: birthLat, lng: birthLng, timezone: selectedTimezone?.ianaName ?? undefined } : null} onSelect={(city) => { setBirthLat(city?.lat || null); setBirthLng(city?.lng || null); setBirthPlaceName(city?.name || null); if (city?.timezone) { setSelectedTimezone(matchTimezoneOption(city.timezone)); } else if (!city) { setSelectedTimezone(null); } }} />
              </div>
              <Divider />
              <div>
                <label className="block text-xs mb-3 tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('timezone')}</label>
                {selectedTimezone ? <TimezoneSelector selectedIana={selectedTimezone.ianaName} onChange={(tz) => setSelectedTimezone(tz)} /> : <div className="w-full px-6 py-4 rounded-2xl text-lg font-medium" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground) / 0.5)' }}>{t('unknown')}</div>}
              </div>
              <Divider />
              <div>
                <label className="block text-xs mb-3 tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('gender')}</label>
                <div className="flex gap-3">
                  {(['M', 'F'] as const).map((g) => (
                    <button key={g} onClick={() => setGender(gender === g ? null : g)} className="flex-1 py-3 rounded-xl text-sm font-light transition-all" style={{ background: gender === g ? 'hsl(var(--foreground))' : 'hsl(var(--muted))', color: gender === g ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
                      {g === 'M' ? t('male') : t('female')}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}>{t('genderNote')}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-light" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>{t('cancel')}</button>
            <button onClick={handleSave} disabled={!canSave || saveMutation.isPending} className="flex-1 py-3 rounded-xl text-sm font-light disabled:opacity-40" style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}>{saveMutation.isPending ? '...' : t('save')}</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}