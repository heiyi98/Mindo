'use client';

import { useEffect, useState, use } from 'react';

interface ReadingDiagnostics {
  id: string;
  user_id: string;
  profile_id: string | null;
  ai_reading_status: string | null;
  retry_count: number;
  content_policy_retry_count: number;
  first_attempt_at: string;
  last_attempt_at: string;
  alert_status: string | null;
  charge_type: 'wallet' | 'voucher' | null;
  charge_wallet_amount: number;
  charge_voucher_id: string | null;
  charge_refunded_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #262626' };
const labelStyle: React.CSSProperties = { color: '#737373' };

export default function AdminReadingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reading, setReading] = useState<ReadingDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/readings/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? '查询失败');
        setReading(d.reading);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: '#737373', fontSize: 13 }}>加载中...</p>;
  if (error) return <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>;
  if (!reading) return null;

  const fields: [string, string][] = [
    ['报告ID', reading.id],
    ['用户ID', reading.user_id],
    ['档案ID', reading.profile_id ?? '—'],
    ['当前状态', reading.ai_reading_status ?? '—'],
    ['警报状态', reading.alert_status ?? '—'],
    ['技术性重试次数', String(reading.retry_count)],
    ['内容政策重试次数', String(reading.content_policy_retry_count)],
    ['首次尝试时间', new Date(reading.first_attempt_at).toLocaleString()],
    ['最近一次尝试时间', new Date(reading.last_attempt_at).toLocaleString()],
    ['扣费方式', reading.charge_type ?? '—'],
    ['扣费金额', String(reading.charge_wallet_amount)],
    ['凭证ID', reading.charge_voucher_id ?? '—'],
    ['已退款时间', reading.charge_refunded_at ? new Date(reading.charge_refunded_at).toLocaleString() : '—'],
    ['软删除时间', reading.deleted_at ? new Date(reading.deleted_at).toLocaleString() : '—'],
    ['创建时间', new Date(reading.created_at).toLocaleString()],
  ];

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 16 }}>报告详情（诊断用）</h1>
      <div style={{ fontSize: 13 }}>
        {fields.map(([label, value]) => (
          <div key={label} style={rowStyle}>
            <span style={labelStyle}>{label}</span>
            <span style={{ fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all', marginLeft: 16 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
