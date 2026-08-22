'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Alert {
  id: string;
  reading_id: string | null;
  alert_type: string;
  message: string | null;
  created_at: string;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  api_key_invalid: 'API密钥失效/配额耗尽',
  data_missing: '传入数据缺失',
  content_policy_exceeded: '内容政策拦截超限',
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadAlerts = () => {
    setLoading(true);
    fetch('/api/admin/alerts')
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await fetch(`/api/admin/alerts/${id}`, { method: 'PATCH' });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 16, marginBottom: 4 }}>八字报告重试警报</h1>
      <p style={{ fontSize: 12, color: '#737373', marginBottom: 20 }}>
        标记已处理只是关掉这条警报本身，不会让卡住的记录自动恢复重试——卡住的记录依然靠定时任务在持续尝试。
      </p>

      {loading ? (
        <p style={{ color: '#737373', fontSize: 13 }}>加载中...</p>
      ) : alerts.length === 0 ? (
        <p style={{ color: '#737373', fontSize: 13 }}>没有待处理的警报。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#737373', textAlign: 'left' }}>
              <th style={{ padding: '8px 0' }}>类型</th>
              <th>报告</th>
              <th>信息</th>
              <th>发生时间</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} style={{ borderTop: '1px solid #262626' }}>
                <td style={{ padding: '8px 0' }}>{ALERT_TYPE_LABELS[a.alert_type] ?? a.alert_type}</td>
                <td>
                  {a.reading_id ? (
                    <Link href={`/admin/readings/${a.reading_id}`} style={{ color: '#a3a3a3' }}>
                      {a.reading_id.slice(0, 8)}…
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ maxWidth: 360, color: '#a3a3a3' }}>{a.message ?? '—'}</td>
                <td style={{ color: '#a3a3a3' }}>{new Date(a.created_at).toLocaleString()}</td>
                <td>
                  <button
                    onClick={() => handleResolve(a.id)}
                    disabled={resolvingId === a.id}
                    style={{
                      background: 'transparent',
                      color: '#e5e5e5',
                      border: '1px solid #262626',
                      borderRadius: 8,
                      padding: '4px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {resolvingId === a.id ? '处理中...' : '标记已处理'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
