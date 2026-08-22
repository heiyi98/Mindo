'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ADMIN_SERVICE_TYPES } from '@/config/adminServiceTypes';
import { WALLET_UNIT_LABEL } from '@/config/payments';

const inputStyle: React.CSSProperties = {
  background: '#171717',
  border: '1px solid #262626',
  color: '#e5e5e5',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
};

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#a3a3a3', marginBottom: 4, display: 'block' };

const REWARD_TYPE_LABELS: Record<string, string> = {
  voucher: '兑换券',
  wallet: WALLET_UNIT_LABEL,
  vip: 'VIP时长',
  pro: 'Pro时长',
};

interface Batch {
  id: string;
  code_prefix: string;
  reward_type: string;
  total_count: number;
  redeemedCount: number;
  code_expires_at: string | null;
  created_at: string;
}

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // 类型放最前面，决定下面展示哪些字段
  const [rewardType, setRewardType] = useState<'voucher' | 'wallet' | 'vip' | 'pro'>('voucher');

  // 所有类型共用字段
  const [codePrefix, setCodePrefix] = useState('');
  const [totalCount, setTotalCount] = useState('10');
  const [codeExpiresAt, setCodeExpiresAt] = useState('');

  // 兑换券专属
  const [voucherServiceType, setVoucherServiceType] = useState(ADMIN_SERVICE_TYPES[0]?.value ?? '');
  const [voucherCoverageType, setVoucherCoverageType] = useState<'full' | 'percentage' | 'fixed_amount'>('full');
  const [voucherCoverageValue, setVoucherCoverageValue] = useState('');
  const [voucherUses, setVoucherUses] = useState('1');

  // 虚拟币专属
  const [walletAmount, setWalletAmount] = useState('');

  // VIP时长专属
  const [vipDays, setVipDays] = useState('');

  // Pro时长专属
  const [proDays, setProDays] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = () => {
    setLoading(true);
    fetch('/api/admin/batches')
      .then((r) => r.json())
      .then((d) => setBatches(d.batches ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!totalCount) {
      setError('缺少生成张数');
      return;
    }

    let rewardConfig: Record<string, unknown>;
    if (rewardType === 'voucher') {
      rewardConfig = {
        service_type: voucherServiceType,
        coverage_type: voucherCoverageType,
        coverage_value: voucherCoverageType === 'full' ? 0 : Number(voucherCoverageValue),
        uses: Number(voucherUses),
      };
    } else if (rewardType === 'wallet') {
      rewardConfig = { amount: Number(walletAmount) };
    } else if (rewardType === 'vip') {
      rewardConfig = { days: Number(vipDays) };
    } else {
      rewardConfig = { days: Number(proDays) };
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codePrefix: codePrefix.trim() ? codePrefix.trim().toUpperCase() : undefined,
          rewardType,
          rewardConfig,
          codeExpiresAt: codeExpiresAt ? new Date(codeExpiresAt).toISOString() : undefined,
          totalCount: Number(totalCount),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '创建失败');
        return;
      }
      setCodePrefix('');
      loadBatches();
    } finally {
      setSubmitting(false);
    }
  };

  const discountValueLabel =
    voucherCoverageType === 'percentage' ? '折扣百分比' : voucherCoverageType === 'fixed_amount' ? `抵扣${WALLET_UNIT_LABEL}数` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 16, marginBottom: 16 }}>生成兑换码批次</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>类型</label>
            <select style={{ ...inputStyle, width: '100%' }} value={rewardType} onChange={(e) => setRewardType(e.target.value as any)}>
              <option value="voucher">兑换券</option>
              <option value="wallet">{WALLET_UNIT_LABEL}</option>
              <option value="vip">VIP时长</option>
              <option value="pro">Pro时长</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>前缀</label>
            <input style={{ ...inputStyle, width: '100%' }} value={codePrefix} onChange={(e) => setCodePrefix(e.target.value)} placeholder="MINDO" />
          </div>
          <div>
            <label style={labelStyle}>生成张数</label>
            <input style={{ ...inputStyle, width: '100%' }} type="number" value={totalCount} onChange={(e) => setTotalCount(e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>过期时间</label>
            <input style={{ ...inputStyle, width: '100%' }} type="date" value={codeExpiresAt} onChange={(e) => setCodeExpiresAt(e.target.value)} />
          </div>

          {rewardType === 'voucher' && (
            <>
              <div>
                <label style={labelStyle}>项目</label>
                <select style={{ ...inputStyle, width: '100%' }} value={voucherServiceType} onChange={(e) => setVoucherServiceType(e.target.value)}>
                  {ADMIN_SERVICE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>兑换性质</label>
                <select style={{ ...inputStyle, width: '100%' }} value={voucherCoverageType} onChange={(e) => setVoucherCoverageType(e.target.value as any)}>
                  <option value="full">全免</option>
                  <option value="percentage">百分比折扣</option>
                  <option value="fixed_amount">定额抵扣</option>
                </select>
              </div>
              {voucherCoverageType !== 'full' && (
                <div>
                  <label style={labelStyle}>{discountValueLabel}</label>
                  <input
                    style={{ ...inputStyle, width: '100%' }}
                    type="number"
                    value={voucherCoverageValue}
                    onChange={(e) => setVoucherCoverageValue(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label style={labelStyle}>可用次数</label>
                <input style={{ ...inputStyle, width: '100%' }} type="number" value={voucherUses} onChange={(e) => setVoucherUses(e.target.value)} />
              </div>
            </>
          )}

          {rewardType === 'wallet' && (
            <div>
              <label style={labelStyle}>金额</label>
              <input style={{ ...inputStyle, width: '100%' }} type="number" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} />
            </div>
          )}

          {rewardType === 'vip' && (
            <div>
              <label style={labelStyle}>天数</label>
              <input style={{ ...inputStyle, width: '100%' }} type="number" value={vipDays} onChange={(e) => setVipDays(e.target.value)} />
            </div>
          )}

          {rewardType === 'pro' && (
            <div>
              <label style={labelStyle}>天数</label>
              <input style={{ ...inputStyle, width: '100%' }} type="number" value={proDays} onChange={(e) => setProDays(e.target.value)} />
            </div>
          )}
        </div>

        {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ background: '#e5e5e5', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
        >
          {submitting ? '生成中...' : '生成批次'}
        </button>
      </div>

      <div>
        <h1 style={{ fontSize: 16, marginBottom: 16 }}>批次列表</h1>
        {loading ? (
          <p style={{ color: '#737373', fontSize: 13 }}>加载中...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#737373', textAlign: 'left' }}>
                <th style={{ padding: '8px 0' }}>前缀</th>
                <th>类型</th>
                <th>已核销/总数</th>
                <th>过期时间</th>
                <th>创建时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ borderTop: '1px solid #262626' }}>
                  <td style={{ padding: '8px 0' }}>{b.code_prefix || '—'}</td>
                  <td>{REWARD_TYPE_LABELS[b.reward_type] ?? b.reward_type}</td>
                  <td>{b.redeemedCount} / {b.total_count}</td>
                  <td>{b.code_expires_at ? new Date(b.code_expires_at).toLocaleDateString() : '永久'}</td>
                  <td>{new Date(b.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/admin/batches/${b.id}`} style={{ color: '#a3a3a3' }}>详情</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
