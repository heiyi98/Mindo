import { useTranslations } from 'next-intl'

export default function AuthErrorPage() {
  const t = useTranslations('auth')
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-destructive">{t('error.message')}</p>
    </div>
  )
}
