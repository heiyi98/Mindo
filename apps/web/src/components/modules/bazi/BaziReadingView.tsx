'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Sparkles, ChevronLeft, Share2, Download, Trash2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useTheme } from '@/components/theme/ThemeProvider'
import { BaziOverviewChart, BaziShishenChart, BaziInteractionChart } from './BaziReadingChart'
import { Theme1Skeleton, MultiBlockSkeleton, Theme4Skeleton } from './BaziReadingSkeleton'
import { usePdfExport } from '@/hooks/usePdfExport'
import { SHISHEN_ZH_TO_KEY, SCENE_ZH_TO_KEY, formatRelationLine, formatGanZhiRelation } from '@/lib/bazi/relationsFormat'
import type { ShishenRelations, ShishenNodeRelation, GanZhiRelation } from '@/lib/bazi/reportRelations'
import VoucherSelector from '@/components/payments/VoucherSelector'

interface ThemeData {
  ai_reading_theme1: any | null
  ai_reading_theme2: any | null
  ai_reading_theme3: any | null
  ai_reading_theme4: any | null
  ai_reading_status: string | null
}

interface Props {
  snapshotId: string | null
  readingId: string | null
  shishenMetadata: ShishenRelations
  ganZhiRelations: GanZhiRelation[]
  calculationResult: any
  initialData: ThemeData
  locale: string
  birthMismatch: boolean
}

const ELEMENT_COLORS: Record<string, string> = {
  Wood: '#388E3C', Fire: '#D32F2F', Earth: '#F57F17',
  Metal: '#757575', Water: '#1976D2', gray: '#6b7280',
}

const ShortDivider = () => (
  <div className="my-6">
    <div className="w-8 border-t border-border/40" />
  </div>
)

const LongDivider = () => (
  <div className="my-8 border-t border-border/60" />
)

const SectionGap = () => <div className="mb-16" />

export default function BaziReadingView({
  snapshotId, readingId, shishenMetadata, ganZhiRelations, calculationResult, initialData, locale, birthMismatch,
}: Props) {
  const t = useTranslations('bazi')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [data, setData] = useState<ThemeData>(initialData)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showMismatch, setShowMismatch] = useState(birthMismatch)
  const [voucherId, setVoucherId] = useState<string | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const tPayment = useTranslations('payment')

  const overviewRef = useRef<HTMLDivElement>(null)
  const shishenRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const interactionRefs = useRef<(HTMLDivElement | null)[]>([])

  const { exportPdf } = usePdfExport(locale)

  // 状态驱动渲染：空值=从没生成过；'done'=完整报告；其余非空值（generating/phase1/
  // theme1~4）=正在生成中，不管卡在哪一段都显示骨架屏，已到手的主题正常渲染。
  // 不会再出现failed_xxx——失败到底的记录会被系统自动退款+软删除，
  // 页面查不到这条记录，直接回到"还没有报告"这一支，不需要在这里特殊处理。
  const hasStarted = !!data.ai_reading_status
  const isDone = data.ai_reading_status === 'done'

  const dayStemZH = (() => {
    if (!calculationResult) return ''
    const dayStem: string = calculationResult.dayStem ?? ''
    const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
    const dayStemNode = tianGanNodes.find((n: any) => n.pos === 'DayStem')
    const wuxing: string = dayStemNode?.wuxing ?? ''
    const yinyang: string = dayStemNode?.yinyang ?? ''
    const stemZH = t(`tiangan.${dayStem}`) || dayStem
    const wuxingZH = t(`wuxing.${wuxing}`) || wuxing
    const yinyangZH = yinyang === 'Yang' ? t('yinyang.Yang') : yinyang === 'Yin' ? t('yinyang.Yin') : ''
    return `${stemZH}（${yinyangZH}${wuxingZH}）`
  })()

  function getShishenInfo(shishenLabel: string, relations: ShishenNodeRelation[]): {
    color: string
    wuxing: string
    yinyang: string
  } {
    if (!calculationResult) return { color: ELEMENT_COLORS['gray'], wuxing: '', yinyang: '' }
    const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
    const cangGanNodes: any[] = calculationResult.pillars?.cangGanNodes ?? []
    const shishenMap: any[] = calculationResult.shishen?.shishenMap ?? []

    const ssKey = SHISHEN_ZH_TO_KEY[shishenLabel]
    if (ssKey) {
      const ssNode = shishenMap.find((s: any) => s.shishen === ssKey)
      if (ssNode) {
        const tianNode = tianGanNodes.find((n: any) => n.id === ssNode.id)
        if (tianNode?.wuxing) {
          return {
            color: ELEMENT_COLORS[tianNode.wuxing] ?? ELEMENT_COLORS['gray'],
            wuxing: tianNode.wuxing,
            yinyang: tianNode.yinyang ?? '',
          }
        }
        const cangNode = cangGanNodes.find((n: any) => n.id === ssNode.id)
        if (cangNode?.wuxing) {
          return {
            color: ELEMENT_COLORS[cangNode.wuxing] ?? ELEMENT_COLORS['gray'],
            wuxing: cangNode.wuxing,
            yinyang: cangNode.yinyang ?? '',
          }
        }
      }
    }

    for (const rel of relations) {
      const posKey = rel.position
      if (rel.nodeType === 'TianGan') {
        const node = tianGanNodes.find((n: any) => n.pos === posKey)
        if (node?.wuxing) return {
          color: ELEMENT_COLORS[node.wuxing] ?? ELEMENT_COLORS['gray'],
          wuxing: node.wuxing,
          yinyang: node.yinyang ?? '',
        }
      } else {
        const benQi = cangGanNodes.find((cg: any) => cg.branchPos === posKey && cg.qi === 'BenQi')
        if (benQi?.wuxing) return {
          color: ELEMENT_COLORS[benQi.wuxing] ?? ELEMENT_COLORS['gray'],
          wuxing: benQi.wuxing,
          yinyang: benQi.yinyang ?? '',
        }
      }
    }
    return { color: ELEMENT_COLORS['gray'], wuxing: '', yinyang: '' }
  }

  useEffect(() => {
    // 还没生成过报告时readingId是null，没有行可订阅，不建立realtime连接
    if (!readingId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`reading-${readingId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'bazi_readings', filter: `id=eq.${readingId}`,
      }, (payload) => {
        setData(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [readingId])

  useEffect(() => {
    // 只有还没生成过报告时才需要展示价格
    if (readingId) return
    fetch('/api/payments/price?service_type=bazi_report')
      .then(r => r.json())
      .then(d => { if (typeof d.price === 'number') setPrice(d.price) })
      .catch(() => {})
  }, [readingId])

  const handleGenerate = async () => {
    setSubmitting(true)
    setShowMismatch(false)
    setGenerateError(null)
    try {
      const res = await fetch('/api/ai/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId, locale, voucherId }),
      })
      const d = await res.json()
      if (res.ok && d.readingId) {
        router.push(`/dashboard/assessments/bazi/reading?readingId=${d.readingId}`)
        return
      }
      // 非2xx（余额不足/凭证不可用/价格未配置/建记录失败等）都要落到这里给出提示，
      // 不能什么都不做——之前只判断了d.readingId存在与否，失败时页面会一直停在
      // "生成中"，什么反馈都没有
      const errorMap: Record<string, string> = {
        insufficient_balance: t('reading.errors.insufficientBalance'),
        voucher_unavailable: t('reading.errors.voucherUnavailable'),
      }
      setGenerateError(errorMap[d.code] ?? d.error ?? t('reading.errors.generic'))
      setSubmitting(false)
    } catch (err) {
      console.error(err)
      setGenerateError(t('reading.errors.generic'))
      setSubmitting(false)
    }
  }

  // 出生信息变更后的"重新生成"：档案隔离机制现在会拒绝对已有报告的档案重复生成，
  // 所以这里必须先删除这条已经过时的旧报告，再走一次普通的生成流程。
  const handleMismatchRegenerate = async () => {
    if (readingId) {
      await fetch(`/api/ai/reading/${readingId}`, { method: 'DELETE' }).catch(() => {})
    }
    await handleGenerate()
  }

  const handleDelete = async () => {
    if (!readingId) return
    if (!window.confirm(t('reading.deleteConfirm'))) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/ai/reading/${readingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.code === 'reading_not_done' ? 'not_done' : 'delete failed')
      }
      router.push('/dashboard/assessments/bazi')
    } catch (err) {
      console.error(err)
      setGenerateError(
        err instanceof Error && err.message === 'not_done'
          ? t('reading.errors.notDone')
          : t('reading.errors.generic')
      )
      setDeleting(false)
    }
  }

  const handlePdfExport = async () => {
    setExporting(true)
    setShowShareMenu(false)
    try {
      await exportPdf(
        {
          theme1: data.ai_reading_theme1,
          theme2: data.ai_reading_theme2,
          theme3: data.ai_reading_theme3,
          theme4: data.ai_reading_theme4,
          dayStemZH,
          shishenMetadata,
          ganZhiRelations,
        },
        { overviewRef, shishenRefs, interactionRefs }
      )
    } catch (e) {
      console.error('PDF导出失败:', e)
    } finally {
      setExporting(false)
    }
  }

  const TopBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
      style={{ background: 'hsl(var(--background))', borderBottom: '1px solid hsl(var(--border)/0.4)' }}
    >
      <button
        onClick={() => router.back()}
        className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex items-center gap-2">
        {readingId && isDone && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label={t('reading.delete')}
            className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  )

  if (!hasStarted) {
    return (
      <>
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 flex flex-col items-center gap-6">
          <Sparkles size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {t('reading.noReading')}
          </p>
          {price !== null && (
            <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
              {t('reading.priceLabel', { price, unit: tPayment('walletUnit') })}
            </p>
          )}
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <VoucherSelector serviceType="bazi_report" value={voucherId} onChange={setVoucherId} />
            <button
              onClick={handleGenerate}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-light disabled:opacity-50"
              style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
            >
              <Sparkles size={14} />
              {submitting ? tCommon('loading') : t('reading.buyReading')}
            </button>
            {generateError && (
              <p className="text-xs text-center" style={{ color: 'hsl(var(--destructive))' }}>
                {generateError}
              </p>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar />

      {showMismatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-xl"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <p className="text-sm font-medium text-foreground mb-2">{t('reading.mismatchTitle')}</p>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              {t('reading.mismatchDesc')}
            </p>
            <div className="mb-3">
              <VoucherSelector serviceType="bazi_report" value={voucherId} onChange={setVoucherId} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMismatch(false)}
                className="flex-1 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('reading.mismatchContinue')}
              </button>
              <button
                onClick={handleMismatchRegenerate}
                disabled={submitting}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
              >
                {t('reading.mismatchRegenerate')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">

        {isDone && (
          <div className="fixed right-6 top-16 z-40">
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(v => !v)}
                className="flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-colors"
                style={{
                  background: 'hsl(var(--foreground))',
                  color: 'hsl(var(--background))',
                }}
              >
                <Share2 size={16} />
              </button>
              {showShareMenu && (
                <div
                  className="absolute right-0 mt-2 rounded-xl shadow-lg overflow-hidden"
                  style={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    minWidth: 140,
                  }}
                >
                  <button
                    onClick={handlePdfExport}
                    disabled={exporting}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-left hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Download size={14} />
                    {exporting ? tCommon('loading') : 'PDF'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <div ref={overviewRef} style={{ width: 280, background: 'white' }}>
            <BaziOverviewChart calculationResult={calculationResult} />
          </div>
          {data.ai_reading_theme2 && (() => {
            const mechanisms: any[] = data.ai_reading_theme2?.['主题二_内部机制'] ?? []
            return mechanisms.map((m: any) => {
              const label: string = m['机制标签'] ?? ''
              const ssKey = SHISHEN_ZH_TO_KEY[label]
              const relations: ShishenNodeRelation[] = (ssKey && shishenMetadata[ssKey]) || []
              if (relations.length === 0 || !calculationResult) return null
              const { color: shishenColor, wuxing: shishenWuxing, yinyang: shishenYinyang } = getShishenInfo(label, relations)
              if (!shishenWuxing) return null
              return (
                <div key={label} ref={el => { shishenRefs.current[label] = el }} style={{ width: 280, background: 'white' }}>
                  <BaziShishenChart
                    calculationResult={calculationResult}
                    relations={relations}
                    shishenColor={shishenColor}
                    shishenWuxing={shishenWuxing}
                    shishenYinyang={shishenYinyang}
                  />
                </div>
              )
            })
          })()}
          {data.ai_reading_theme2 && (() => {
            const interactions: any[] = data.ai_reading_theme2?.['机制交互'] ?? []
            return interactions.map((_item: any, i: number) => {
              const structuredRel = ganZhiRelations[i]
              if (!calculationResult || !structuredRel) return null
              return (
                <div key={i} ref={el => { interactionRefs.current[i] = el }} style={{ width: 280, background: 'white' }}>
                  <BaziInteractionChart
                    calculationResult={calculationResult}
                    relation={structuredRel}
                  />
                </div>
              )
            })
          })()}
        </div>

        <section>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="font-medium tracking-widest" style={{ fontSize: '28px' }}>{t('reading.sectionTitle1')}</h2>
              {dayStemZH && (
                <p className="text-xs text-muted-foreground mt-1">{t('daymaster')}：{dayStemZH}</p>
              )}
            </div>
            {calculationResult && (
              <div className="flex-shrink-0">
                <BaziOverviewChart calculationResult={calculationResult} />
              </div>
            )}
          </div>
          {data.ai_reading_theme1 ? <Theme1 data={data.ai_reading_theme1} /> : <Theme1Skeleton />}
        </section>

        <SectionGap />

        <section>
          <h2 className="font-medium tracking-widest mb-8" style={{ fontSize: '28px' }}>{t('reading.sectionTitle2')}</h2>
          {data.ai_reading_theme2 ? (
            <Theme2
              data={data.ai_reading_theme2}
              shishenMetadata={shishenMetadata}
              ganZhiRelations={ganZhiRelations}
              calculationResult={calculationResult}
              getShishenInfo={getShishenInfo}
            />
          ) : <MultiBlockSkeleton blocks={3} />}
        </section>

        <SectionGap />

        <section>
          <h2 className="font-medium tracking-widest mb-8" style={{ fontSize: '28px' }}>{t('reading.sectionTitle3')}</h2>
          {data.ai_reading_theme3 ? <Theme3 data={data.ai_reading_theme3} /> : <MultiBlockSkeleton blocks={3} />}
        </section>

        <SectionGap />

        <section>
          <h2 className="font-medium tracking-widest mb-8" style={{ fontSize: '28px' }}>{t('reading.sectionTitle4')}</h2>
          {data.ai_reading_theme4 ? <Theme4 data={data.ai_reading_theme4} /> : <Theme4Skeleton />}
        </section>

        {generateError && (
          <p className="text-sm text-center mt-8" style={{ color: 'hsl(var(--destructive))' }}>
            {generateError}
          </p>
        )}
      </div>
    </>
  )
}

function Theme1({ data }: { data: any }) {
  const text: string = data['主题一_人格核心'] ?? ''
  const paragraphs = text.split('\n\n').filter(Boolean)
  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
      ))}
    </div>
  )
}

function Theme2({
  data, shishenMetadata, ganZhiRelations, calculationResult, getShishenInfo,
}: {
  data: any
  shishenMetadata: ShishenRelations
  ganZhiRelations: GanZhiRelation[]
  calculationResult: any
  getShishenInfo: (label: string, relations: ShishenNodeRelation[]) => { color: string; wuxing: string; yinyang: string }
}) {
  const t = useTranslations('bazi')
  const mechanisms: any[] = data['主题二_内部机制'] ?? []
  const interactions: any[] = data['机制交互'] ?? []

  return (
    <div>
      {mechanisms.map((m, i) => {
        const label: string = m['机制标签'] ?? ''
        const ssKey = SHISHEN_ZH_TO_KEY[label]
        const relations: ShishenNodeRelation[] = (ssKey && shishenMetadata[ssKey]) || []
        const hasValidMeta = relations.length > 0
        const { color: shishenColor, wuxing: shishenWuxing, yinyang: shishenYinyang } = getShishenInfo(label, relations)

        return (
          <div key={i}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground mb-1" style={{ fontSize: '18px' }}>
                  {ssKey ? t(`shishen.${ssKey}`) : label}
                </p>
                {hasValidMeta && (
                  <div>
                    {relations.map((rel, j) => (
                      <p key={j} className="text-xs text-muted-foreground font-mono">
                        {formatRelationLine(t, rel)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              {hasValidMeta && calculationResult && shishenWuxing && (
                <div className="flex-shrink-0">
                  <BaziShishenChart
                    calculationResult={calculationResult}
                    relations={relations}
                    shishenColor={shishenColor}
                    shishenWuxing={shishenWuxing}
                    shishenYinyang={shishenYinyang}
                  />
                </div>
              )}
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">{m['解析']}</p>
            {i < mechanisms.length - 1 && <ShortDivider />}
          </div>
        )
      })}

      {interactions.length > 0 && (
        <>
          <LongDivider />
          <p className="text-muted-foreground tracking-widest uppercase mb-6" style={{ fontSize: '18px' }}>{t('reading.interactions')}</p>
          <div>
            {interactions.map((item, i) => {
              const structuredRel = ganZhiRelations[i]
              return (
                <div key={i}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="text-xs text-muted-foreground font-mono flex-1">
                      {structuredRel ? formatGanZhiRelation(t, structuredRel) : ''}
                    </p>
                    {calculationResult && structuredRel && (
                      <div className="flex-shrink-0">
                        <BaziInteractionChart
                          calculationResult={calculationResult}
                          relation={structuredRel}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/80">{item['解析']}</p>
                  {i < interactions.length - 1 && <ShortDivider />}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function Theme3({ data }: { data: any }) {
  const t = useTranslations('bazi')
  const scenes = data['主题三_现实反应'] ?? {}
  const sceneKeys = ['交友', '工作', '事业', '约束', '积累', '爱情', '理想']
  const validKeys = sceneKeys.filter(k => scenes[k])
  return (
    <div>
      {validKeys.map((key, i) => (
        <div key={key}>
          <p className="font-medium text-foreground mb-3" style={{ fontSize: '18px' }}>
            {t(`reading.scenes.${SCENE_ZH_TO_KEY[key]}`)}
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">{scenes[key]}</p>
          {i < validKeys.length - 1 && <ShortDivider />}
        </div>
      ))}
    </div>
  )
}

function Theme4({ data }: { data: any }) {
  const t = useTranslations('bazi')
  const optimData = data['主题四_优化'] ?? {}
  const coreConflict: string = optimData['核心矛盾'] ?? ''
  const selfAlign: string = optimData['人生自洽建议'] ?? ''
  const targeted: Record<string, string> = optimData['针对性优化'] ?? {}
  const targetedEntries = Object.entries(targeted).filter(([, v]) => v)
  return (
    <div>
      {coreConflict && (
        <div>
          <p className="text-muted-foreground tracking-widest uppercase mb-3" style={{ fontSize: '18px' }}>{t('reading.coreConflict')}</p>
          <p className="text-sm leading-relaxed text-foreground/80">{coreConflict}</p>
        </div>
      )}
      {coreConflict && selfAlign && <ShortDivider />}
      {selfAlign && (
        <div>
          <p className="text-muted-foreground tracking-widest uppercase mb-3" style={{ fontSize: '18px' }}>{t('reading.selfAlignment')}</p>
          <p className="text-sm leading-relaxed text-foreground/80">{selfAlign}</p>
        </div>
      )}
      {targetedEntries.length > 0 && <LongDivider />}
      {targetedEntries.length > 0 && (
        <div>
          <p className="text-muted-foreground tracking-widest uppercase mb-6" style={{ fontSize: '18px' }}>{t('reading.targeted')}</p>
          {targetedEntries.map(([scene, content], i) => (
            <div key={scene}>
              <p className="font-medium text-foreground mb-3" style={{ fontSize: '18px' }}>
                {SCENE_ZH_TO_KEY[scene] ? t(`reading.scenes.${SCENE_ZH_TO_KEY[scene]}`) : scene}
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">{content}</p>
              {i < targetedEntries.length - 1 && <ShortDivider />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}