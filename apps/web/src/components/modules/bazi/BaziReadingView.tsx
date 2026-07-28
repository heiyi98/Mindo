'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Sparkles, ChevronLeft, Share2, Download } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useTheme } from '@/components/theme/ThemeProvider'
import { BaziOverviewChart, BaziShishenChart, BaziInteractionChart } from './BaziReadingChart'
import { usePdfExport } from '@/hooks/usePdfExport'

interface ThemeData {
  ai_reading_theme1: any | null
  ai_reading_theme2: any | null
  ai_reading_theme3: any | null
  ai_reading_theme4: any | null
}

interface Props {
  snapshotId: string | null
  readingId: string
  shishenMetadata: Record<string, string[]>
  calculationResult: any
  initialData: ThemeData
  locale: string
  birthMismatch: boolean
}

const ELEMENT_COLORS: Record<string, string> = {
  Wood: '#388E3C', Fire: '#D32F2F', Earth: '#F57F17',
  Metal: '#757575', Water: '#1976D2', gray: '#6b7280',
}

// 十神→五行映射（从日主推算，这里直接从calculationResult读节点五行）
const SHISHEN_ZH_TO_KEY: Record<string, string> = {
  '比肩': 'BiJian', '劫财': 'JieCai', '食神': 'ShiShen', '伤官': 'ShangGuan',
  '偏财': 'PianCai', '正财': 'ZhengCai', '七杀': 'QiSha', '正官': 'ZhengGuan',
  '偏印': 'PianYin', '正印': 'ZhengYin',
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
  snapshotId, readingId, shishenMetadata, calculationResult, initialData, locale, birthMismatch,
}: Props) {
  const t = useTranslations('bazi')
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [data, setData] = useState<ThemeData>(initialData)
  const [generating, setGenerating] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showMismatch, setShowMismatch] = useState(birthMismatch)

  // 隐藏截图容器的refs
  const overviewRef = useRef<HTMLDivElement>(null)
  const shishenRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const interactionRefs = useRef<(HTMLDivElement | null)[]>([])

  const { exportPdf } = usePdfExport(locale)

  const hasAnyTheme =
    !!data.ai_reading_theme1 || !!data.ai_reading_theme2 ||
    !!data.ai_reading_theme3 || !!data.ai_reading_theme4

  // 日主中文
  const dayStemZH = (() => {
    if (!calculationResult) return ''
    const dayStem: string = calculationResult.dayStem ?? ''
    const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
    const dayStemNode = tianGanNodes.find((n: any) => n.pos === 'DayStem')
    const wuxing: string = dayStemNode?.wuxing ?? ''
    const yinyang: string = dayStemNode?.yinyang ?? ''
    const stemZH = t(`tiangan.${dayStem}`) || dayStem
    const wuxingZH = t(`wuxing.${wuxing}`) || wuxing
    const yinyangZH = yinyang === 'Yang' ? '阳' : yinyang === 'Yin' ? '阴' : ''
    return `${stemZH}（${yinyangZH}${wuxingZH}）`
  })()

  // 从shishenMap找十神对应的五行颜色、wuxing、yinyang
  function getShishenInfo(shishenLabel: string, metaLines: string[]): {
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

    // fallback：从metaLines第一行的宫位找五行
    for (const line of metaLines) {
      if (line === '（无节点）') continue
      const label = line.split('：')[0].trim()
      const posKeyMap: Record<string, string> = {
        '年干': 'YearStem', '月干': 'MonthStem', '日干': 'DayStem', '时干': 'HourStem',
        '年支': 'YearBranch', '月支': 'MonthBranch', '日支': 'DayBranch', '时支': 'HourBranch',
      }
      const posKey = posKeyMap[label]
      if (!posKey) continue
      if (posKey.includes('Stem')) {
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

  const handleGenerate = async () => {
    setGenerating(true)
    setShowMismatch(false)
    try {
      const res = await fetch('/api/ai/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId }),
      })
      const d = await res.json()
      if (d.readingId) {
        // 跳转到新报告页
        router.push(`/dashboard/assessments/bazi/reading?readingId=${d.readingId}`)
      }
    } catch (err) {
      console.error(err)
      setGenerating(false)
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
      {/* 单纯的"返回上一页"，不写死目标地址——报告可能是从八字主页
          点进来的，也可能是从资产管理点进来的，router.back() 会精准
          回到用户实际来的那一页，不需要程序去猜 */}
      <button
        onClick={() => router.back()}
        className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </div>
  )

  if (!hasAnyTheme) {
    return (
      <>
        <TopBar />
        <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 flex flex-col items-center gap-6">
          <Sparkles size={32} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {generating ? t('reading.generating') : t('reading.noReading')}
          </p>
          {!generating && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-light"
              style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
            >
              <Sparkles size={14} />
              {t('reading.buyReading')}
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar />

      {/* 出生信息不符提示 */}
      {showMismatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-xl"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <p className="text-sm font-medium text-foreground mb-2">出生信息已修改</p>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              检测到档案的出生信息与报告生成时不一致，是否重新生成报告？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMismatch(false)}
                className="flex-1 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                继续查看
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
              >
                重新生成
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">

        {/* 分享按钮：界面右上角，固定在视口 */}
        {hasAnyTheme && (
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
                    {exporting ? '生成中...' : 'PDF'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 隐藏截图容器：fixed定位在视口内但不可见，确保html2canvas能截到 */}
        <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          {/* 总览命盘 */}
          <div ref={overviewRef} style={{ width: 280, background: 'white' }}>
            <BaziOverviewChart calculationResult={calculationResult} />
          </div>
          {/* 十神命盘 */}
          {data.ai_reading_theme2 && (() => {
            const mechanisms: any[] = data.ai_reading_theme2?.['主题二_内部机制'] ?? []
            return mechanisms.map((m: any) => {
              const label: string = m['机制标签'] ?? ''
              const metaLines: string[] = shishenMetadata[label] ?? []
              const hasValidMeta = metaLines.length > 0 && metaLines[0] !== '（无节点）'
              if (!hasValidMeta || !calculationResult) return null
              const { color: shishenColor, wuxing: shishenWuxing, yinyang: shishenYinyang } = getShishenInfo(label, metaLines)
              if (!shishenWuxing) return null
              return (
                <div key={label} ref={el => { shishenRefs.current[label] = el }} style={{ width: 280, background: 'white' }}>
                  <BaziShishenChart
                    calculationResult={calculationResult}
                    metaLines={metaLines}
                    shishenColor={shishenColor}
                    shishenWuxing={shishenWuxing}
                    shishenYinyang={shishenYinyang}
                  />
                </div>
              )
            })
          })()}
          {/* 机制交互命盘 */}
          {data.ai_reading_theme2 && (() => {
            const interactions: any[] = data.ai_reading_theme2?.['机制交互'] ?? []
            return interactions.map((item: any, i: number) => {
              const relation: string = item['关系'] ?? ''
              if (!calculationResult) return null
              return (
                <div key={i} ref={el => { interactionRefs.current[i] = el }} style={{ width: 280, background: 'white' }}>
                  <BaziInteractionChart
                    calculationResult={calculationResult}
                    relation={relation}
                  />
                </div>
              )
            })
          })()}
        </div>

        {/* 主题一：人格核心 */}
        {data.ai_reading_theme1 && (
          <section>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-medium tracking-widest" style={{ fontSize: '28px' }}>人格核心</h2>
                {dayStemZH && (
                  <p className="text-xs text-muted-foreground mt-1">日主：{dayStemZH}</p>
                )}
              </div>
              {calculationResult && (
                <div className="flex-shrink-0">
                  <BaziOverviewChart calculationResult={calculationResult} />
                </div>
              )}
            </div>
            <Theme1 data={data.ai_reading_theme1} />
          </section>
        )}

        <SectionGap />

        {/* 主题二：心理机制 */}
        {data.ai_reading_theme2 && (
          <section>
            <h2 className="font-medium tracking-widest mb-8" style={{ fontSize: '28px' }}>心理机制</h2>
            <Theme2
              data={data.ai_reading_theme2}
              shishenMetadata={shishenMetadata}
              calculationResult={calculationResult}
              getShishenInfo={getShishenInfo}
            />
          </section>
        )}

        <SectionGap />

        {/* 主题三：现实反应 */}
        {data.ai_reading_theme3 && (
          <section>
            <h2 className="font-medium tracking-widest mb-8" style={{ fontSize: '28px' }}>现实反应</h2>
            <Theme3 data={data.ai_reading_theme3} />
          </section>
        )}

        <SectionGap />

        {/* 主题四：调优建议 */}
        {data.ai_reading_theme4 && (
          <section>
            <h2 className="font-medium tracking-widest mb-8" style={{ fontSize: '28px' }}>调优建议</h2>
            <Theme4 data={data.ai_reading_theme4} />
          </section>
        )}

        {generating && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            {t('reading.generating')}
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
  data, shishenMetadata, calculationResult, getShishenInfo,
}: {
  data: any
  shishenMetadata: Record<string, string[]>
  calculationResult: any
  getShishenInfo: (label: string, metaLines: string[]) => { color: string; wuxing: string; yinyang: string }
}) {
  const mechanisms: any[] = data['主题二_内部机制'] ?? []
  const interactions: any[] = data['机制交互'] ?? []

  return (
    <div>
      {mechanisms.map((m, i) => {
        const label: string = m['机制标签'] ?? ''
        const metaLines: string[] = shishenMetadata[label] ?? []
        const hasValidMeta = metaLines.length > 0 && metaLines[0] !== '（无节点）'
        const { color: shishenColor, wuxing: shishenWuxing, yinyang: shishenYinyang } = getShishenInfo(label, metaLines)

        return (
          <div key={i}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground mb-1" style={{ fontSize: '18px' }}>{label}</p>
                {hasValidMeta && (
                  <div>
                    {metaLines.map((line, j) => (
                      <p key={j} className="text-xs text-muted-foreground font-mono">{line}</p>
                    ))}
                  </div>
                )}
              </div>
              {hasValidMeta && calculationResult && shishenWuxing && (
                <div className="flex-shrink-0">
                  <BaziShishenChart
                    calculationResult={calculationResult}
                    metaLines={metaLines}
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
          <p className="text-muted-foreground tracking-widest uppercase mb-6" style={{ fontSize: '18px' }}>机制交互</p>
          <div>
            {interactions.map((item, i) => {
              const relation: string = item['关系'] ?? ''
              return (
                <div key={i}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="text-xs text-muted-foreground font-mono flex-1">{relation}</p>
                    {calculationResult && (
                      <div className="flex-shrink-0">
                        <BaziInteractionChart
                          calculationResult={calculationResult}
                          relation={relation}
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
  const scenes = data['主题三_现实反应'] ?? {}
  const sceneKeys = ['交友', '工作', '事业', '约束', '积累', '爱情', '理想']
  const validKeys = sceneKeys.filter(k => scenes[k])
  return (
    <div>
      {validKeys.map((key, i) => (
        <div key={key}>
          <p className="font-medium text-foreground mb-3" style={{ fontSize: '18px' }}>{key}</p>
          <p className="text-sm leading-relaxed text-foreground/80">{scenes[key]}</p>
          {i < validKeys.length - 1 && <ShortDivider />}
        </div>
      ))}
    </div>
  )
}

function Theme4({ data }: { data: any }) {
  const optimData = data['主题四_优化'] ?? {}
  const coreConflict: string = optimData['核心矛盾'] ?? ''
  const selfAlign: string = optimData['人生自洽建议'] ?? ''
  const targeted: Record<string, string> = optimData['针对性优化'] ?? {}
  const targetedEntries = Object.entries(targeted).filter(([, v]) => v)
  return (
    <div>
      {coreConflict && (
        <div>
          <p className="text-muted-foreground tracking-widest uppercase mb-3" style={{ fontSize: '18px' }}>核心矛盾</p>
          <p className="text-sm leading-relaxed text-foreground/80">{coreConflict}</p>
        </div>
      )}
      {coreConflict && selfAlign && <ShortDivider />}
      {selfAlign && (
        <div>
          <p className="text-muted-foreground tracking-widest uppercase mb-3" style={{ fontSize: '18px' }}>人生自洽建议</p>
          <p className="text-sm leading-relaxed text-foreground/80">{selfAlign}</p>
        </div>
      )}
      {targetedEntries.length > 0 && <LongDivider />}
      {targetedEntries.length > 0 && (
        <div>
          <p className="text-muted-foreground tracking-widest uppercase mb-6" style={{ fontSize: '18px' }}>针对性优化</p>
          {targetedEntries.map(([scene, content], i) => (
            <div key={scene}>
              <p className="font-medium text-foreground mb-3" style={{ fontSize: '18px' }}>{scene}</p>
              <p className="text-sm leading-relaxed text-foreground/80">{content}</p>
              {i < targetedEntries.length - 1 && <ShortDivider />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}