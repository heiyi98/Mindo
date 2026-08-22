import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/os/LanguageSwitcher';

// 内容库首页：这次重建只负责把数据库驱动的地基和词条/归类页面打通，
// 首页本身的视觉设计（图谱/卡片等）留到后面单独一轮再做，这里先给一个
// 最简占位，不让 /codex 直接404。
export default async function CodexHomePage() {
  const t = await getTranslations('codex');

  return (
    <div style={{ maxWidth: 576, margin: '0 auto', padding: '24px 16px' }}>
      <LanguageSwitcher />
      <h1 style={{ fontSize: 24, marginTop: 24 }}>{t('home')}</h1>
    </div>
  );
}
