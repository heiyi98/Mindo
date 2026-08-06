'use client';

import { useEffect, useState } from 'react';
import { ADMIN_SERVICE_TYPES } from '@/config/adminServiceTypes';
import { WALLET_UNIT_LABEL } from '@/config/payments';

const inputStyle: React.CSSProperties = {
  background: '#171717',
  border: '1px solid #262626',
  color: '#e5e5e5',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 13,
};

interface Price {
  service_type: string;
  price: number;
}

function labelFor(serviceType: string): string {
  return ADMIN_SERVICE_TYPES.find((s) => s.value === serviceType)?.label ?? serviceType;
}

export default function AdminPricesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [newServiceType, setNewServiceType] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/prices')
      .then((r) => r.json())
      .then((d) => setPrices(d.prices ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (serviceType: string, price: number) => {
    setSaving(serviceType);
    try {
      await fetch('/api/admin/prices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType, price }),
      });
      load();
    } finally {
      setSaving(null);
    }
  };

  const existingTypes = new Set(prices.map((p) => p.service_type));
  const addableOptions = ADMIN_SERVICE_TYPES.filter((s) => !existingTypes.has(s.value));

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 16 }}>价目表</h1>
      {loading ? (
        <p style={{ color: '#737373', fontSize: 13 }}>加载中...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
          <thead>
            <tr style={{ color: '#737373', textAlign: 'left' }}>
              <th style={{ padding: '8px 0' }}>项目</th>
              <th>{WALLET_UNIT_LABEL}价格</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <PriceRow key={p.service_type} price={p} onSave={save} saving={saving === p.service_type} />
            ))}
          </tbody>
        </table>
      )}

      {addableOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 12, color: '#a3a3a3', display: 'block', marginBottom: 4 }}>项目</label>
            <select style={inputStyle} value={newServiceType} onChange={(e) => setNewServiceType(e.target.value)}>
              <option value="">选择项目</option>
              {addableOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#a3a3a3', display: 'block', marginBottom: 4 }}>价格</label>
            <input style={inputStyle} type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <button
            onClick={async () => {
              if (!newServiceType || !newPrice) return;
              await save(newServiceType, Number(newPrice));
              setNewServiceType('');
              setNewPrice('');
            }}
            style={{ background: '#e5e5e5', color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
          >
            新增
          </button>
        </div>
      )}
    </div>
  );
}

function PriceRow({ price, onSave, saving }: { price: Price; onSave: (t: string, p: number) => void; saving: boolean }) {
  const [value, setValue] = useState(String(price.price));

  return (
    <tr style={{ borderTop: '1px solid #262626' }}>
      <td style={{ padding: '8px 0' }}>{labelFor(price.service_type)}</td>
      <td>
        <input style={inputStyle} type="number" value={value} onChange={(e) => setValue(e.target.value)} />
      </td>
      <td>
        <button
          onClick={() => onSave(price.service_type, Number(value))}
          disabled={saving}
          style={{ background: 'none', border: '1px solid #262626', color: '#a3a3a3', borderRadius: 8, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}
        >
          {saving ? '...' : '保存'}
        </button>
      </td>
    </tr>
  );
}
