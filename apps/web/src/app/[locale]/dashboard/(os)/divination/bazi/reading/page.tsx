import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BaziReadingView from '@/components/modules/bazi/BaziReadingView'
import { buildShishenMetadata } from '@mindo/core'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ snapshotId?: string }>
}

export default async function BaziReadingPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { snapshotId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  if (!snapshotId) redirect(`/${locale}/dashboard/divination/bazi`)

  const { data: snapshot } = await supabase
    .from('bazi_snapshots')
    .select('id, calculation_result, ai_reading_theme1, ai_reading_theme2, ai_reading_theme3, ai_reading_theme4')
    .eq('id', snapshotId)
    .eq('user_id', user.id)
    .single()

  if (!snapshot) redirect(`/${locale}/dashboard/divination/bazi`)

  const shishenMetadata = snapshot.calculation_result
    ? buildShishenMetadata(snapshot.calculation_result)
    : {}

  return (
    <BaziReadingView
      snapshotId={snapshotId}
      shishenMetadata={shishenMetadata}
      initialData={{
        ai_reading_theme1: snapshot.ai_reading_theme1,
        ai_reading_theme2: snapshot.ai_reading_theme2,
        ai_reading_theme3: snapshot.ai_reading_theme3,
        ai_reading_theme4: snapshot.ai_reading_theme4,
      }}
    />
  )
}