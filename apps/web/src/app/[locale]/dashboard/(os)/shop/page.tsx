import {useTranslations} from 'next-intl';
export default function ShopPage() {
  const t = useTranslations('nav');
  return <div style={{color: 'hsl(var(--foreground))'}}>{t('shop')}</div>;
}
