'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { CurrentProfileProvider, useCurrentProfile } from '@/components/os/CurrentProfileContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import type { ConstitutionResult, ConstitutionVersion } from '@mindo/core';
import { buildConstitutionPrompt } from './constitutionPrompt';

const WUXING_LABEL: Record<string, string> = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
const WUXING_SYSTEM_LABEL: Record<string, string> = {
  Wood: '木·肝系统',
  Fire: '火·心系统',
  Earth: '土·脾系统',
  Metal: '金·肺系统',
  Water: '水·肾系统',
};
const YINYANG_LABEL: Record<string, string> = { Yang: '阳', Yin: '阴' };
const ADVICE_LABEL: Record<string, string> = { supplement: '宜补', reduce: '宜泻', neutral: '持平' };
const WUXING_ORDER = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'] as const;

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);
function daysInMonth(year: string, month: string): number[] {
  const y = Number(year) || CURRENT_YEAR;
  const m = Number(month) || 1;
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => i + 1);
}

interface ApiResult {
  regular: ConstitutionResult;
  ziping: ConstitutionResult;
}

const primaryButtonStyle: React.CSSProperties = {
  background: 'hsl(var(--foreground))',
  color: 'hsl(var(--background))',
  border: 'none',
  borderRadius: 8,
  padding: '9px 20px',
  fontSize: 13,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'hsl(var(--foreground))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  padding: '7px 16px',
  fontSize: 12,
  cursor: 'pointer',
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'hsl(var(--foreground))' : 'transparent',
        color: active ? 'hsl(var(--background))' : 'hsl(var(--foreground))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 8,
        padding: '7px 16px',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 12, marginTop: 32 }}>{children}</h2>;
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '8px 0',
        borderBottom: '1px solid hsl(var(--border) / 0.5)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</span>
      <span>
        {value}
        {sub && <span style={{ color: 'hsl(var(--muted-foreground))', marginLeft: 8 }}>{sub}</span>}
      </span>
    </div>
  );
}

function ResultLayers({ result }: { result: ConstitutionResult }) {
  return (
    <div>
      <SectionTitle>阴阳</SectionTitle>
      <StatRow
        label="总局阴阳"
        value={`阳 ${result.layerOne.overall.yangSum.toFixed(1)}（${result.layerOne.overall.yangLabel}） / 阴 ${result.layerOne.overall.yinSum.toFixed(1)}（${result.layerOne.overall.yinLabel}）`}
      />
      <StatRow
        label="天干阴阳"
        value={`阳 ${result.layerOne.tianGan.yangSum.toFixed(1)}（${result.layerOne.tianGan.yangLabel}） / 阴 ${result.layerOne.tianGan.yinSum.toFixed(1)}（${result.layerOne.tianGan.yinLabel}）`}
      />
      <StatRow
        label="地支阴阳"
        value={`阳 ${result.layerOne.cangGan.yangSum.toFixed(1)}（${result.layerOne.cangGan.yangLabel}） / 阴 ${result.layerOne.cangGan.yinSum.toFixed(1)}（${result.layerOne.cangGan.yinLabel}）`}
      />

      <SectionTitle>藏象</SectionTitle>
      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>五行静态值</p>
      {result.layerTwo.fiveResults.map(r => (
        <StatRow key={r.wuxing} label={WUXING_LABEL[r.wuxing]} value={r.value.toFixed(1)} sub={r.label} />
      ))}
      <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: '16px 0 8px' }}>
        阴阳五行十干静态值 + 脏腑映射
      </p>
      {result.layerTwo.tenResults.map(r => (
        <StatRow
          key={`${r.yinyang}_${r.wuxing}`}
          label={`${YINYANG_LABEL[r.yinyang]}${WUXING_LABEL[r.wuxing]}（${r.organ}）`}
          value={r.value.toFixed(1)}
          sub={r.label}
        />
      ))}

      <SectionTitle>整体协同</SectionTitle>
      {WUXING_ORDER.map(w => (
        <StatRow key={w} label={WUXING_SYSTEM_LABEL[w]} value={result.layerThree[w].toFixed(1)} />
      ))}

      <SectionTitle>建议</SectionTitle>
      {result.layerFour.map(p => (
        <StatRow key={p.wuxing} label={WUXING_LABEL[p.wuxing]} value={ADVICE_LABEL[p.advice]} />
      ))}
    </div>
  );
}

const manualSelectStyle: React.CSSProperties = {
  background: 'hsl(var(--muted) / 0.4)',
  border: '1px solid hsl(var(--border))',
  color: 'hsl(var(--foreground))',
  borderRadius: 6,
  padding: '5px 2px',
  fontSize: 13,
  textAlign: 'center',
};

function ConstitutionInner() {
  const router = useRouter();
  const { currentProfile } = useCurrentProfile();

  const [manual, setManual] = useState({ year: '', month: '', day: '', hour: '', minute: '' });

  const [version, setVersion] = useState<ConstitutionVersion>('regular');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const compute = useCallback(async (body: Record<string, unknown>) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/pro/constitution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '计算失败');
        return;
      }
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // 档案一切换（含首次加载默认档案）直接出结果，不需要额外点击
  useEffect(() => {
    if (currentProfile) {
      compute({ mode: 'profile', profileId: currentProfile.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.id]);

  const handleManualCompute = () => {
    if (Object.values(manual).some(v => v.trim() === '')) {
      setError('请把年月日时分填完整');
      return;
    }
    compute({
      mode: 'manual',
      year: Number(manual.year),
      month: Number(manual.month),
      day: Number(manual.day),
      hour: Number(manual.hour),
      minute: Number(manual.minute),
    });
  };

  const current = result ? result[version] : null;

  const handleCopyPrompt = () => {
    if (!current) return;
    const prompt = buildConstitutionPrompt(current);
    navigator.clipboard.writeText(prompt).then(() => {
      setCopyMsg('已复制到剪贴板');
      setTimeout(() => setCopyMsg(null), 2000);
    });
  };

  const manualReady = Object.values(manual).every(v => v.trim() !== '');

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 56,
          background: 'hsl(var(--background) / 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <ProfileSwitcher />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <select
            value={manual.year}
            onChange={e => setManual({ ...manual, year: e.target.value })}
            style={{ ...manualSelectStyle, width: 64 }}
          >
            <option value="">年</option>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={manual.month}
            onChange={e => setManual({ ...manual, month: e.target.value, day: '' })}
            style={{ ...manualSelectStyle, width: 44 }}
          >
            <option value="">月</option>
            {MONTH_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={manual.day}
            onChange={e => setManual({ ...manual, day: e.target.value })}
            style={{ ...manualSelectStyle, width: 44 }}
          >
            <option value="">日</option>
            {daysInMonth(manual.year, manual.month).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={manual.hour}
            onChange={e => setManual({ ...manual, hour: e.target.value })}
            style={{ ...manualSelectStyle, width: 44 }}
          >
            <option value="">时</option>
            {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <select
            value={manual.minute}
            onChange={e => setManual({ ...manual, minute: e.target.value })}
            style={{ ...manualSelectStyle, width: 44 }}
          >
            <option value="">分</option>
            {MINUTE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button
            onClick={handleManualCompute}
            disabled={!manualReady || loading}
            style={{ ...primaryButtonStyle, padding: '6px 14px', opacity: manualReady && !loading ? 1 : 0.5 }}
          >
            {loading ? '…' : '排盘'}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeToggle />
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, marginBottom: 24 }}>先天体质</h1>

        {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {result && (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '8px 0 8px' }}>
              <TabButton active={version === 'regular'} onClick={() => setVersion('regular')}>常规版</TabButton>
              <TabButton active={version === 'ziping'} onClick={() => setVersion('ziping')}>子平版</TabButton>
              <div style={{ flex: 1 }} />
              <button onClick={handleCopyPrompt} style={secondaryButtonStyle}>AI分析指令</button>
            </div>
            {copyMsg && <p style={{ fontSize: 12, color: '#4ade80', marginBottom: 8 }}>{copyMsg}</p>}

            {current && <ResultLayers result={current} />}
          </>
        )}
      </div>
    </div>
  );
}

export default function ConstitutionView() {
  return (
    <CurrentProfileProvider>
      <ConstitutionInner />
    </CurrentProfileProvider>
  );
}
