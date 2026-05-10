'use client';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface ProfileCardProps {
  displayName: string;
  birthDate: string;
  birthTime?: string | null;
  birthPlaceName?: string | null;
  solarTime?: string | null;  // 真太阳时，格式 "HH:MM"
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function parseDayOffset(
  birthTime: string,
  solarTime: string
): number {
  const [bh] = birthTime.split(':').map(Number);
  const [sh] = solarTime.split(':').map(Number);
  if (bh >= 22 && sh <= 2) return 1;
  if (bh <= 2 && sh >= 22) return -1;
  return 0;
}

export default function ProfileCard({
  displayName,
  birthDate,
  birthTime,
  birthPlaceName,
  solarTime,
}: ProfileCardProps) {
  const t = useTranslations('dashboard.profileCard');
  const age = calcAge(birthDate);
  const showSolarTime = !!birthTime && !!birthPlaceName && !!solarTime;

  let dayOffset = 0;
  if (showSolarTime && birthTime && solarTime) {
    dayOffset = parseDayOffset(birthTime, solarTime);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full px-4 py-4 rounded-2xl"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2
            className="text-base font-light"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {displayName}
          </h2>
          <p
            className="text-xs font-light"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {birthDate}
            {birthTime && ` ${birthTime}`}
            {birthPlaceName && ` · ${birthPlaceName.split(',')[0]}`}
          </p>
        </div>

        <div className="text-right space-y-1 flex-shrink-0">
          <p
            className="text-sm font-light"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {age} {t('yearsOld')}
          </p>
          {showSolarTime && (
            <p
              className="text-xs font-light"
              style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
            >
              {t('solarTime')}：{solarTime}
              {dayOffset === 1 && (
                <span
                  className="ml-1 text-xs"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                >
                  +1
                </span>
              )}
              {dayOffset === -1 && (
                <span
                  className="ml-1 text-xs"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                >
                  -1
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
