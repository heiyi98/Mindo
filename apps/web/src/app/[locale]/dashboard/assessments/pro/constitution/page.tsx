import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConstitutionView from '@/components/pro/ConstitutionView'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function ConstitutionPage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: userRow } = await supabase
    .from('users')
    .select('pro_expires_at')
    .eq('id', user.id)
    .maybeSingle()

  const isProActive = !!userRow?.pro_expires_at && new Date(userRow.pro_expires_at).getTime() > Date.now()
  if (!isProActive) redirect(`/${locale}/dashboard/assessments`)

  return <ConstitutionView />
}
