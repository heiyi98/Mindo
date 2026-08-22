'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';

// 复用前台的主题系统本身（同一个ThemeProvider/useTheme，同一套CSS变量、
// 同一个localStorage键），不是另起一套——只是换了一个不依赖next-intl的
// 展示组件：后台从来没有接入过next-intl（管理界面本身就是纯中文，不需要
// 多语言），前台的<ThemeToggle/>用了useTranslations('theme')，直接复用会
// 因为缺少NextIntlClientProvider而崩溃，所以这里是同一套逻辑换一层不依赖
// next-intl的外壳，标签直接写死中文。
export function AdminThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: '浅色' },
    { value: 'dark' as const, icon: Moon, label: '深色' },
    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: 999,
        background: 'hsl(var(--muted))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      {options.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            title={label}
            onClick={() => setTheme(value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: 999,
              border: 'none',
              background: isActive ? 'hsl(var(--background))' : 'transparent',
              color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
            }}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}
