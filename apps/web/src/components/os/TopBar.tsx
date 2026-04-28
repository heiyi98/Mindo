'use client';
import {useTopBar} from './TopBarContext';
import {ThemeToggle} from '@/components/theme/ThemeToggle';

export function TopBar() {
  const {content} = useTopBar();
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 48,
        right: 0,
        height: 48,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--glass-bg)',
        borderBottom: '1px solid var(--glass-border)',
        backdropFilter: 'blur(var(--glass-blur))',
      }}
    >
      <div style={{flex: 1}}>{content.left}</div>
      <div style={{flex: 1, textAlign: 'center'}}>{content.center}</div>
      <div style={{flex: 1, display: 'flex', justifyContent: 'flex-end'}}>
        {content.right ?? <ThemeToggle />}
      </div>
    </header>
  );
}
