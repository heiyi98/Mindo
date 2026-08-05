import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MindoMark } from '@/components/common/MindoMark';

// Codex 根首页：静态图谱装饰 + 卡片导航区。
// 当前只有"八字"一个节点/一张卡片，全部写死，不做任何动态生成或"更多主题即将推出"占位。
// 以后新增主题时，直接在这里手写第二个节点/第二张卡片。
export async function CodexHome({ locale }: { locale: string }) {
  const t = await getTranslations('codex.home');
  const baziHref = `/${locale}/codex/china/bazi`;

  return (
    <div style={{ maxWidth: 576, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '32px 8px' }}>
        <MindoMark size={40} strokeWidth={60} />
        <div style={{ flex: 1, height: 1, background: 'hsl(var(--border))' }} />
        <Link
          href={baziHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 20px',
            borderRadius: 999,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {t('graph.baziLabel')}
        </Link>
      </div>

      <div style={{ marginTop: 24 }}>
        <Link
          href={baziHref}
          style={{
            display: 'block',
            padding: 20,
            borderRadius: 16,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            textDecoration: 'none',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{t('cards.bazi.title')}</h2>
          <p style={{ margin: '8px 0 16px', opacity: 0.75, fontSize: 14 }}>
            {t('cards.bazi.description')}
          </p>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(var(--primary))' }}>
            {t('cards.bazi.cta')} →
          </span>
        </Link>
      </div>
    </div>
  );
}
