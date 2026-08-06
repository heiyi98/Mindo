import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BaziReadingView from '@/components/modules/bazi/BaziReadingView'
import { buildShishenRelations, buildGanZhiRelations } from '@/lib/bazi/reportRelations'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ readingId?: string; snapshotId?: string }>
}

export default async function BaziReadingPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { readingId, snapshotId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  if (!readingId && !snapshotId) redirect(`/${locale}/dashboard/assessments/bazi`)

  // 还没生成过报告：只凭snapshotId进页面，免费查看价格/生成按钮/可用兑换券，
  // 报告记录（bazi_readings行）要等用户点了"生成报告"才会创建
  if (!readingId) {
    const { data: snapshot } = await supabase
      .from('bazi_snapshots')
      .select('id, calculation_result')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!snapshot) redirect(`/${locale}/dashboard/assessments/bazi`)

    const shishenMetadata = snapshot.calculation_result
      ? buildShishenRelations(snapshot.calculation_result)
      : {}
    const ganZhiRelations = snapshot.calculation_result
      ? buildGanZhiRelations(snapshot.calculation_result)
      : []

    return (
      <BaziReadingView
        snapshotId={snapshot.id}
        readingId={null}
        shishenMetadata={shishenMetadata}
        ganZhiRelations={ganZhiRelations}
        calculationResult={snapshot.calculation_result ?? null}
        locale={locale}
        birthMismatch={false}
        initialData={{
          ai_reading_theme1: null,
          ai_reading_theme2: null,
          ai_reading_theme3: null,
          ai_reading_theme4: null,
        }}
      />
    )
  }

  // 读取报告——calculation_result 是报告自留的命盘快照，生成那一刻就钉死了，
  // 之后渲染图表只读这一份，不再依赖 bazi_snapshots/profiles 是否还存在。
  const { data: reading } = await supabase
    .from('bazi_readings')
    .select('id, profile_id, birth_date, birth_time, birth_lat, birth_lng, ai_reading_theme1, ai_reading_theme2, ai_reading_theme3, ai_reading_theme4, ai_reading_status, calculation_result')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!reading) redirect(`/${locale}/dashboard/assessments/bazi`)

  // 档案还在的情况下，才做"出生信息是否被改过"的比对和"重新生成"用的
  // 最新快照查询——profile_id 为 null（档案已被删除）时，两者都直接跳过，
  // 不再提示、也不支持重新生成，这两个功能本来就依赖档案存在这个前提。
  let birthMismatch = false
  let latestSnapshotId: string | null = null

  if (reading.profile_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('birth_date, birth_time, birth_lat, birth_lng')
      .eq('id', reading.profile_id)
      .maybeSingle()

    if (profile) {
      birthMismatch =
        reading.birth_date !== profile.birth_date ||
        reading.birth_time !== profile.birth_time ||
        reading.birth_lat !== profile.birth_lat ||
        reading.birth_lng !== profile.birth_lng
    }

    const { data: snapshot } = await supabase
      .from('bazi_snapshots')
      .select('id')
      .eq('profile_id', reading.profile_id)
      .eq('user_id', user.id)
      .maybeSingle()

    latestSnapshotId = snapshot?.id ?? null
  }

  const shishenMetadata = reading.calculation_result
    ? buildShishenRelations(reading.calculation_result)
    : {}

  const ganZhiRelations = reading.calculation_result
    ? buildGanZhiRelations(reading.calculation_result)
    : []

  return (
    <BaziReadingView
      snapshotId={latestSnapshotId}
      readingId={readingId}
      shishenMetadata={shishenMetadata}
      ganZhiRelations={ganZhiRelations}
      calculationResult={reading.calculation_result ?? null}
      locale={locale}
      birthMismatch={birthMismatch}
      initialData={{
        ai_reading_theme1: reading.ai_reading_theme1,
        ai_reading_theme2: reading.ai_reading_theme2,
        ai_reading_theme3: reading.ai_reading_theme3,
        ai_reading_theme4: reading.ai_reading_theme4,
      }}
    />
  )
}