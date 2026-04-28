import {useTranslations} from 'next-intl';
export default function ForumPage() {
  const t = useTranslations('nav');
  return <div style={{color: 'hsl(var(--foreground))'}}>{t('forum')}</div>;
}
