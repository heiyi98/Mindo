'use client';

import { useEffect, useState } from 'react';

interface SearchUser {
  id: string;
  handle: string | null;
  display_name: string | null;
}

interface HandleSearchInputProps {
  value: string;
  onChange: (handle: string) => void;
  /** 管理员"直接发放"场景要能搜到自己（给自己账号发测试额度），传false跳过接口默认的排除自己逻辑 */
  excludeSelf?: boolean;
}

const inputStyle: React.CSSProperties = {
  background: '#171717',
  border: '1px solid #262626',
  color: '#e5e5e5',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
};

/**
 * handle搜索输入框，复用私信模块"加好友"那套/api/users/search接口和防抖交互，
 * 只是换了一套跟/admin其他页面一致的暗色字面样式（admin不接入next-intl设计token）。
 */
export default function HandleSearchInput({ value, onChange, excludeSelf = true }: HandleSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/users/search?q=${encodeURIComponent(debounced.trim())}&excludeSelf=${excludeSelf}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setResults(d.users ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const selectUser = (u: SearchUser) => {
    const handle = u.handle ?? '';
    setQuery(handle);
    onChange(handle);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="搜索handle或昵称"
      />
      {open && query.trim() && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#171717',
            border: '1px solid #262626',
            borderRadius: 8,
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 10,
          }}
        >
          {loading ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#737373' }}>搜索中...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#737373' }}>无匹配用户</div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(u)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  color: '#e5e5e5',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                @{u.handle ?? '—'}
                {u.display_name && <span style={{ color: '#737373' }}> · {u.display_name}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
