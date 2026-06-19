'use client';
import ProfileCard from '@/components/dashboard/ProfileCard';
import type { WidgetProps } from './index';

export default function ProfileCardWidget({ dashboardData }: WidgetProps) {
  if (!dashboardData?.profile) {
    return (
      <div
        className="h-full rounded-2xl"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
      />
    );
  }

  const profile = dashboardData.profile as any;
  const bazi = dashboardData.bazi as any;
  const solarTimeDisplay = bazi?.meta?.solarTime
    ? (bazi.meta.solarTime as string).split(' ')[1]?.slice(0, 5)
    : null;

  return (
    <ProfileCard
      displayName={profile.display_name}
      birthDate={profile.birth_date}
      birthTime={profile.birth_time}
      birthPlaceName={profile.birth_place_name}
      solarTime={solarTimeDisplay}
    />
  );
}
