'use client';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardData } from '@/hooks/queries/useDashboardData';

export const COLS = 2;
export const ROWS = 1;
export const CARD_META = { id: 'profile-card', cols: COLS, rows: ROWS, module: null };

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function parseDayOffset(birthTime: string, solarTime: string): number {
  const [bh] = birthTime.split(':').map(Number);
  const [sh] = solarTime.split(':').map(Number);
  if (bh >= 22 && sh <= 2) return 1;
  if (bh <= 2 && sh >= 22) return -1;
  return 0;
}

export default function ProfileCard({ profileId }: { profileId: string }) {
  const t = useTranslations('dashboard.profileCard');
  const { data } = useDashboardData(profileId);
  const profile: Record<string, any> | null = data?.profile ?? null;
  const solarTime = useMemo(() => {
    const raw: string | undefined = data?.bazi?.meta?.solarTime;
    if (!raw) return null;
    const match = raw.match(/(\d{2}:\d{2})/);
    return match ? match[1] : null;
  }, [data]);

  if (!profile) {
    return (
      <div className="w-full h-full rounded-2xl"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
    );
  }

  const birthDate = profile.birth_date ?? '';
  const birthTime = profile.birth_time ?? null;
  const birthPlaceName = profile.birth_place_name ?? null;
  const displayName = profile.display_name ?? '';
  const age = birthDate ? calcAge(birthDate) : 0;
  const showSolarTime = !!birthTime && !!birthPlaceName && !!solarTime;

  const dayOffset = showSolarTime && birthTime && solarTime
    ? parseDayOffset(birthTime, solarTime) : 0;

  // 副标题：日期+时间+城市。
  // 分钟是否已知不再影响前端显示——数据库里分钟未知时本来就存的是
  // HH:00，直接按标准格式截取显示即可，不需要特殊分支或额外标注。
  // 要不要按真太阳时/行政时区偏移这两套算法计算，是后端 time/engine.ts
  // 的事，前端统一只呈现"真太阳时"这一个结果，不再向用户暴露精度差异。
  const displayTime = birthTime ? birthTime.substring(0, 5) : null;

  const subtitle = [
    birthDate,
    displayTime,
    birthPlaceName ? birthPlaceName.split(',')[0] : null,
  ].filter(Boolean).join(' · ');

  // 右侧：年龄 + 真太阳时
  const ageText = `${age} ${t('yearsOld')}`;

  let solarText = null;
  if (showSolarTime && solarTime) {
    solarText = `${t('solarTime')}：${solarTime}${dayOffset === 1 ? ' +1' : dayOffset === -1 ? ' -1' : ''}`;
  }

  // SVG viewBox 固定 200×60（宽:高 = 10:3，2:1卡片内填满）
  const VW = 200;
  const VH = 60;

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block' }}
      >
        {/* 左侧：姓名 + 副标题 */}
        <text
          x={12} y={22}
          fontSize={11}
          fontWeight={300}
          fill="hsl(var(--foreground))"
          dominantBaseline="middle"
        >
          {displayName}
        </text>
        <text
          x={12} y={40}
          fontSize={7}
          fontWeight={300}
          fill="hsl(var(--muted-foreground))"
          dominantBaseline="middle"
        >
          {subtitle}
        </text>

        {/* 右侧：年龄 + 真太阳时 */}
        <text
          x={VW - 12} y={22}
          fontSize={9}
          fontWeight={300}
          fill="hsl(var(--muted-foreground))"
          textAnchor="end"
          dominantBaseline="middle"
        >
          {ageText}
        </text>
        {solarText && (
          <text
            x={VW - 12} y={40}
            fontSize={7}
            fontWeight={300}
            fill="hsl(var(--muted-foreground))"
            textAnchor="end"
            dominantBaseline="middle"
            opacity={0.6}
          >
            {solarText}
          </text>
        )}
      </svg>
    </div>
  );
}