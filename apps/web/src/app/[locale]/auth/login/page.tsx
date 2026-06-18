import { useTranslations } from 'next-intl'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  const t = useTranslations('auth')
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-foreground text-center mb-8">
          {t('login.title')}
        </h1>
        <LoginForm />
      </div>
    </div>
  )
}