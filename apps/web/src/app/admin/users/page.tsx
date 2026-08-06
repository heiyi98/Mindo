'use client';

import { useState } from 'react';
import { WALLET_UNIT_LABEL } from '@/config/payments';

const inputStyle: React.CSSProperties = {
  background: '#171717',
  border: '1px solid #262626',
  color: '#e5e5e5',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
};

export default function AdminUsersPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const search = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '查询失败');
        return;
      }
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 16 }}>用户账本查询</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="用户邮箱"
        />
        <button
          onClick={search}
          disabled={loading}
          style={{ background: '#e5e5e5', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
        >
          {loading ? '查询中...' : '查询'}
        </button>
      </div>

      {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 13, color: '#e5e5e5', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>邮箱：{result.user.email}</span>
            <span>handle：{result.user.handle ?? '—'}</span>
            <span>{WALLET_UNIT_LABEL}余额：{result.balance}</span>
            <span>
              VIP状态：
              {result.user.vip_expires_at && new Date(result.user.vip_expires_at).getTime() > Date.now()
                ? `会员有效期至 ${new Date(result.user.vip_expires_at).toLocaleString()}`
                : '非会员'}
            </span>
          </div>

          <div>
            <h2 style={{ fontSize: 14, marginBottom: 8, color: '#a3a3a3' }}>持有的服务覆盖凭证</h2>
            {result.vouchers.length === 0 ? (
              <p style={{ fontSize: 13, color: '#737373' }}>无</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#737373', textAlign: 'left' }}>
                    <th style={{ padding: '8px 0' }}>服务</th>
                    <th>类型</th>
                    <th>数值</th>
                    <th>剩余次数</th>
                    <th>发行方</th>
                  </tr>
                </thead>
                <tbody>
                  {result.vouchers.map((v: any) => (
                    <tr key={v.id} style={{ borderTop: '1px solid #262626' }}>
                      <td style={{ padding: '8px 0' }}>{v.service_type}</td>
                      <td>{v.coverage_type}</td>
                      <td>{v.coverage_value}</td>
                      <td>{v.remaining_uses}</td>
                      <td>{v.issuer_label ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
