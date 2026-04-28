import {useTranslations} from 'next-intl';
export default function MessagesPage() {
  const t = useTranslations('nav');
  return <div style={{color: 'hsl(var(--foreground))'}}>{t('messages')}</div>;
}
