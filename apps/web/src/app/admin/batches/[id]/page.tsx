'use client';

import { useEffect, useState, use } from 'react';
import { WALLET_UNIT_LABEL } from '@/config/payments';

const REWARD_TYPE_LABELS: Record<string, string> = {
  voucher: '兑换券',
  wallet: WALLET_UNIT_LABEL,
  vip: 'VIP时长',
};

interface Code {
  code: string;
  status: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
}

export default function AdminBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [batch, setBatch] = useState<any>(null);
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/batches/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setBatch(d.batch);
        setCodes(d.codes ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: '#737373', fontSize: 13 }}>加载中...</p>;
  if (!batch) return <p style={{ color: '#f87171', fontSize: 13 }}>批次不存在</p>;

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 16 }}>批次详情：{batch.code_prefix}</h1>
      <div style={{ fontSize: 13, color: '#a3a3a3', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>类型：{REWARD_TYPE_LABELS[batch.reward_type] ?? batch.reward_type}</span>
        <span>配置：{JSON.stringify(batch.reward_config)}</span>
        <span>总数：{batch.total_count}</span>
        <span>过期时间：{batch.code_expires_at ? new Date(batch.code_expires_at).toLocaleString() : '永久'}</span>
        {batch.note && <span>备注：{batch.note}</span>}
      </div>

      <a
        href={`/api/admin/batches/${id}/export`}
        style={{
          display: 'inline-block',
          marginBottom: 20,
          background: '#e5e5e5',
          color: '#0a0a0a',
          borderRadius: 8,
          padding: '8px 20px',
          fontSize: 13,
          textDecoration: 'none',
        }}
      >
        导出未使用的兑换码（CSV）
      </a>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#737373', textAlign: 'left' }}>
            <th style={{ padding: '8px 0' }}>兑换码</th>
            <th>状态</th>
            <th>核销时间</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => {
            // status列在数据库里对"过期未用"这个状态是被动的（核销时才会检查过期，
            // 不会主动被后台任务改写），这里只是按当前时间算出展示用的有效状态，
            // 不代表数据库里那一行真的被改写成了'expired'
            const isPastExpiry = !!batch.code_expires_at && new Date(batch.code_expires_at).getTime() <= Date.now();
            const displayStatus = c.status === 'unused' && isPastExpiry ? 'expired' : c.status;
            return (
              <tr key={c.code} style={{ borderTop: '1px solid #262626' }}>
                <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{c.code}</td>
                <td>{displayStatus}</td>
                <td>{c.redeemed_at ? new Date(c.redeemed_at).toLocaleString() : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
