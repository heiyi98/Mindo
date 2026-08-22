'use client';

import { useEffect, useState } from 'react';
import { WALLET_UNIT_LABEL } from '@/config/payments';

const inputStyle: React.CSSProperties = {
  background: '#171717',
  border: '1px solid #262626',
  color: '#e5e5e5',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 13,
};

interface TierPrice {
  tier_id: string;
  currency_code: string;
  price: number;
}

interface Tier {
  id: string;
  wallet_amount: number;
  display_order: number;
  is_active: boolean;
  wallet_topup_tier_prices: TierPrice[];
}

// fetch包了个薄壳：非2xx时把后端返回的error字段抛出来，调用方统一用try/catch
// 显示，不会再出现"点了按钮什么反应都没有"的情况
async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json().catch(() => ({}));
}

export default function AdminRatesPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTierAmount, setNewTierAmount] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/tiers')
      .then((r) => r.json())
      .then((d) => setTiers(d.tiers ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const addTier = async () => {
    if (!newTierAmount) {
      setError('请先填写档位的虚拟币数量');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await request('/api/admin/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAmount: Number(newTierAmount), displayOrder: tiers.length }),
      });
      setNewTierAmount('');
      load();
    } catch (e: any) {
      setError(e.message ?? '新增失败');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 20 }}>充值套餐</h1>

      {loading ? (
        <p style={{ color: '#737373', fontSize: 13 }}>加载中...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {tiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} onChange={load} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 12, color: '#a3a3a3', display: 'block', marginBottom: 4 }}>
            新增档位
          </label>
          <input style={inputStyle} type="number" value={newTierAmount} onChange={(e) => setNewTierAmount(e.target.value)} />
        </div>
        <button
          onClick={addTier}
          disabled={adding}
          style={{ background: '#e5e5e5', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
        >
          {adding ? '新增中...' : '新增档位'}
        </button>
      </div>
      {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

function TierCard({ tier, onChange }: { tier: Tier; onChange: () => void }) {
  const [displayOrder, setDisplayOrder] = useState(String(tier.display_order));
  const [newCurrency, setNewCurrency] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      onChange();
    } catch (e: any) {
      setError(e.message ?? '操作失败');
    }
  };

  const saveOrder = () =>
    run(() =>
      request(`/api/admin/tiers/${tier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayOrder: Number(displayOrder) }),
      })
    );

  const toggleActive = () =>
    run(() =>
      request(`/api/admin/tiers/${tier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tier.is_active }),
      })
    );

  const deleteTier = () => run(() => request(`/api/admin/tiers/${tier.id}`, { method: 'DELETE' }));

  const addPrice = () => {
    if (!newCurrency.trim() || !newPrice) {
      setError('请填写货币代码和价格');
      return;
    }
    run(async () => {
      await request(`/api/admin/tiers/${tier.id}/prices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencyCode: newCurrency.trim(), price: Number(newPrice) }),
      });
      setNewCurrency('');
      setNewPrice('');
    });
  };

  const deletePrice = (currencyCode: string) =>
    run(() => request(`/api/admin/tiers/${tier.id}/prices/${currencyCode}`, { method: 'DELETE' }));

  return (
    <div style={{ border: '1px solid #262626', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <span style={{ fontSize: 15 }}>
          {tier.wallet_amount} {WALLET_UNIT_LABEL}
        </span>
        <label style={{ fontSize: 12, color: '#a3a3a3', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={tier.is_active} onChange={toggleActive} />
          上架中
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#a3a3a3' }}>排序</span>
          <input
            style={{ ...inputStyle, width: 60 }}
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            onBlur={saveOrder}
          />
        </div>
        <button
          onClick={deleteTier}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid #262626', color: '#f87171', borderRadius: 8, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
        >
          删除档位
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 }}>
        <thead>
          <tr style={{ color: '#737373', textAlign: 'left' }}>
            <th style={{ padding: '4px 0' }}>货币</th>
            <th>价格</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tier.wallet_topup_tier_prices.map((p) => (
            <PriceRow key={p.currency_code} price={p} tierId={tier.id} onChange={onChange} onDelete={() => deletePrice(p.currency_code)} />
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 12, color: '#a3a3a3', display: 'block', marginBottom: 4 }}>货币代码</label>
          <input style={inputStyle} value={newCurrency} onChange={(e) => setNewCurrency(e.target.value.toUpperCase())} placeholder="USD" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#a3a3a3', display: 'block', marginBottom: 4 }}>价格</label>
          <input style={inputStyle} type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        </div>
        <button
          onClick={addPrice}
          style={{ background: 'none', border: '1px solid #262626', color: '#a3a3a3', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
        >
          新增货币
        </button>
      </div>
      {error && <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  );
}

function PriceRow({
  price,
  tierId,
  onChange,
  onDelete,
}: {
  price: TierPrice;
  tierId: string;
  onChange: () => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(String(price.price));

  const save = async () => {
    await request(`/api/admin/tiers/${tierId}/prices`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currencyCode: price.currency_code, price: Number(value) }),
    });
    onChange();
  };

  return (
    <tr style={{ borderTop: '1px solid #262626' }}>
      <td style={{ padding: '4px 0' }}>{price.currency_code}</td>
      <td>
        <input style={inputStyle} type="number" value={value} onChange={(e) => setValue(e.target.value)} onBlur={save} />
      </td>
      <td>
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer' }}
        >
          删除
        </button>
      </td>
    </tr>
  );
}
