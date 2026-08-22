'use client';

import { useState } from 'react';
import { ADMIN_SERVICE_TYPES } from '@/config/adminServiceTypes';
import { WALLET_UNIT_LABEL } from '@/config/payments';
import HandleSearchInput from '@/components/admin/HandleSearchInput';

const inputStyle: React.CSSProperties = {
  background: '#171717',
  border: '1px solid #262626',
  color: '#e5e5e5',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
};

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#a3a3a3', marginBottom: 4, display: 'block' };

export default function AdminGrantPage() {
  const [handle, setHandle] = useState('');
  const [type, setType] = useState<'wallet' | 'vip' | 'pro' | 'voucher'>('wallet');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [proDays, setProDays] = useState('');
  const [serviceType, setServiceType] = useState(ADMIN_SERVICE_TYPES[0]?.value ?? '');
  const [coverageType, setCoverageType] = useState<'full' | 'percentage' | 'fixed_amount'>('full');
  const [coverageValue, setCoverageValue] = useState('');
  const [remainingUses, setRemainingUses] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!handle.trim()) {
      setMessage({ ok: false, text: '缺少handle' });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    const body: Record<string, unknown> = { handle: handle.trim(), type };
    if (type === 'wallet') body.amount = Number(amount);
    if (type === 'vip') body.days = Number(days);
    if (type === 'pro') body.days = Number(proDays);
    if (type === 'voucher') {
      body.serviceType = serviceType;
      body.coverageType = coverageType;
      body.coverageValue = coverageType === 'full' ? 0 : Number(coverageValue);
      body.remainingUses = Number(remainingUses);
      // 发行方必然是管理员自己，这个入口不采集issuerLabel，留空
    }

    try {
      const res = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMessage({ ok: res.ok, text: res.ok ? '发放成功' : (data.error ?? '发放失败') });
    } finally {
      setSubmitting(false);
    }
  };

  const discountValueLabel =
    coverageType === 'percentage' ? '折扣百分比' : coverageType === 'fixed_amount' ? `抵扣${WALLET_UNIT_LABEL}数` : '';

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 16 }}>直接发放</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>用户handle</label>
          <HandleSearchInput value={handle} onChange={setHandle} excludeSelf={false} />
        </div>
        <div>
          <label style={labelStyle}>类型</label>
          <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="wallet">{WALLET_UNIT_LABEL}</option>
            <option value="vip">VIP天数</option>
            <option value="pro">Pro天数</option>
            <option value="voucher">兑换券</option>
          </select>
        </div>

        {type === 'wallet' && (
          <div>
            <label style={labelStyle}>{WALLET_UNIT_LABEL}数量</label>
            <input style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        )}
        {type === 'vip' && (
          <div>
            <label style={labelStyle}>VIP天数</label>
            <input style={inputStyle} type="number" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
        )}
        {type === 'pro' && (
          <div>
            <label style={labelStyle}>Pro天数</label>
            <input style={inputStyle} type="number" value={proDays} onChange={(e) => setProDays(e.target.value)} />
          </div>
        )}
        {type === 'voucher' && (
          <>
            <div>
              <label style={labelStyle}>项目</label>
              <select style={inputStyle} value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                {ADMIN_SERVICE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>兑换性质</label>
              <select style={inputStyle} value={coverageType} onChange={(e) => setCoverageType(e.target.value as any)}>
                <option value="full">全免</option>
                <option value="percentage">百分比折扣</option>
                <option value="fixed_amount">定额抵扣</option>
              </select>
            </div>
            {coverageType !== 'full' && (
              <div>
                <label style={labelStyle}>{discountValueLabel}</label>
                <input style={inputStyle} type="number" value={coverageValue} onChange={(e) => setCoverageValue(e.target.value)} />
              </div>
            )}
            <div>
              <label style={labelStyle}>可用次数</label>
              <input style={inputStyle} type="number" value={remainingUses} onChange={(e) => setRemainingUses(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {message && <p style={{ color: message.ok ? '#4ade80' : '#f87171', fontSize: 13, marginBottom: 12 }}>{message.text}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{ background: '#e5e5e5', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
      >
        {submitting ? '发放中...' : '发放'}
      </button>
    </div>
  );
}
