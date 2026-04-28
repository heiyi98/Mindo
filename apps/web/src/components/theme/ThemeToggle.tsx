'use client';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('theme');

  const options = [
    { value: 'light' as const, icon: Sun, label: t('light') },
    { value: 'dark' as const, icon: Moon, label: t('dark') },
    { value: 'system' as const, icon: Monitor, label: t('system') },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-full"
      style={{
        background: 'hsl(var(--muted))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      {options.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <motion.button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className="relative flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 28,
              height: 28,
              color: isActive
                ? 'hsl(var(--foreground))'
                : 'hsl(var(--muted-foreground))',
            }}
            whileTap={{ scale: 0.9 }}
          >
            {isActive && (
              <motion.div
                layoutId="theme-indicator"
                className="absolute inset-0 rounded-full"
                style={{ background: 'hsl(var(--background))' }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon size={14} className="relative z-10" />
          </motion.button>
        );
      })}
    </div>
  );
}
