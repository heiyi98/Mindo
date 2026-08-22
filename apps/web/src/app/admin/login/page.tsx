'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// 后台管理员账号专用的登录入口，纯账号+密码（不走magic link/验证码那套面向
// 普通用户的流程，也没有接第三方OAuth），底层还是用同一个
// supabase.auth.signInWithPassword()——密码存储/校验复用 Supabase Auth
// 自己的机制，这里没有另外写一套。
//
// 登录成功后直接跳转，不经过 /api/auth/callback 或 /api/auth/confirm——
// 那两个路由会顺手给 public.users 表"自愈"一行数据，管理员账号故意不希望
// public.users 里出现任何痕迹，见迁移SQL顶部说明，所以这里绕开它们，
// 直接在浏览器端调用登录、自己处理跳转。
//
// 这个页面本身对"是不是真的管理员"不做判断——任何知道自己邮箱密码的
// 普通用户理论上也能在这里登录成功，但登录成功之后会被 /admin/layout.tsx
// 的 requireStaffAccount() 挡下来跳回这里，效果上等同于登录被拒绝，不需要
// 在登录表单这一层重复判断一次。这是全站所有后台功能（内容库/兑换码批次/
// 价目表/充值套餐/用户账本查询/重试警报/直接发放）共用的同一个登录入口，
// 不是内容库专属。
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/admin/codex');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--background))' }}>
      <form
        onSubmit={submit}
        style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h1 style={{ fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginBottom: 8 }}>
          Mindo Admin
        </h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="邮箱"
          required
          autoFocus
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            fontSize: 14,
          }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          required
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            fontSize: 14,
          }}
        />

        {error && <div style={{ color: 'hsl(var(--destructive))', fontSize: 13 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'hsl(var(--color-accent))',
            color: '#fff',
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  );
}
