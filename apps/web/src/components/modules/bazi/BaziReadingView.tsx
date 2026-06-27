'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'

interface ThemeData {
  ai_reading_theme1: any | null
  ai_reading_theme2: any | null
  ai_reading_theme3: any | null
  ai_reading_theme4: any | null
}

interface Props {
  snapshotId: string
  shishenMetadata: Record<string, string[]>
  initialData: ThemeData
}

export default function BaziReadingView({ snapshotId, shishenMetadata, initialData }: Props) {
  const t = useTranslations('bazi.reading')
  const [data, setData] = useState<ThemeData>(initialData)
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1)
  const [generating, setGenerating] = useState(false)

  const hasAnyTheme =
    !!data.ai_reading_theme1 ||
    !!data.ai_reading_theme2 ||
    !!data.ai_reading_theme3 ||
    !!data.ai_reading_theme4

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`reading-${snapshotId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bazi_snapshots',
          filter: `id=eq.${snapshotId}`,
        },
        (payload) => {
          setData(prev => ({ ...prev, ...payload.new }))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [snapshotId])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await fetch('/api/ai/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId }),
      })
    } catch (err) {
      console.error(err)
      setGenerating(false)
    }
  }

  if (!hasAnyTheme) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-6">
        <Sparkles size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          {generating ? t('generating') : t('noReading')}
        </p>
        {!generating && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-light"
            style={{
              background: 'hsl(var(--foreground))',
              color: 'hsl(var(--background))',
            }}
          >
            <Sparkles size={14} />
            {t('buyReading')}
          </button>
        )}
      </div>
    )
  }

  const tabs = [
    { id: 1 as const, label: t('tab1') },
    { id: 2 as const, label: t('tab2') },
    { id: 3 as const, label: t('tab3') },
    { id: 4 as const, label: t('tab4') },
  ]

  const themeKey = `ai_reading_theme${activeTab}` as keyof ThemeData
  const currentTheme = data[themeKey]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex gap-2 mb-8 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              activeTab === tab.id
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!currentTheme ? (
        <div className="text-muted-foreground text-sm">{t('generating')}</div>
      ) : (
        <>
          {activeTab === 1 && <Theme1 data={currentTheme} t={t} />}
          {activeTab === 2 && <Theme2 data={currentTheme} t={t} shishenMetadata={shishenMetadata} />}
          {activeTab === 3 && <Theme3 data={currentTheme} t={t} />}
          {activeTab === 4 && <Theme4 data={currentTheme} t={t} />}
        </>
      )}
    </div>
  )
}

function Theme1({ data, t }: { data: any; t: any }) {
  const text: string = data['主题一_人格核心'] ?? ''
  const paragraphs = text.split('\n\n').filter(Boolean)
  return (
    <div>
      <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">{t('tab1')}</p>
      <h2 className="text-lg font-medium mb-6">{t('title1')}</h2>
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
        ))}
      </div>
    </div>
  )
}

function Theme2({ data, t, shishenMetadata }: { data: any; t: any; shishenMetadata: Record<string, string[]> }) {
  const mechanisms: any[] = data['主题二_内部机制'] ?? []
  const interactions: any[] = data['机制交互'] ?? []
  return (
    <div>
      <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">{t('tab2')}</p>
      <h2 className="text-lg font-medium mb-6">{t('title2')}</h2>
      <div className="space-y-6">
        {mechanisms.map((m, i) => {
          const label: string = m['机制标签'] ?? ''
          const metaLines: string[] = shishenMetadata[label] ?? []
          return (
            <div key={i}>
              <p className="text-sm font-medium text-foreground mb-1">{label}</p>
              {metaLines.length > 0 && metaLines[0] !== '（无节点）' && (
                <div className="mb-2">
                  {metaLines.map((line, j) => (
                    <p key={j} className="text-xs text-muted-foreground font-mono">{line}</p>
                  ))}
                </div>
              )}
              <p className="text-sm leading-relaxed text-foreground/80">{m['解析']}</p>
              {i < mechanisms.length - 1 && <div className="mt-6 border-t border-border/50" />}
            </div>
          )
        })}
      </div>
      {interactions.length > 0 && (
        <div className="mt-10">
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">{t('interactions')}</p>
          <div className="space-y-4">
            {interactions.map((item, i) => (
              <div key={i} className="border border-border rounded-md px-4 py-3">
                <p className="text-xs text-muted-foreground font-mono mb-2">{item['关系']}</p>
                <p className="text-sm leading-relaxed text-foreground/80">{item['解析']}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Theme3({ data, t }: { data: any; t: any }) {
  const scenes = data['主题三_现实反应'] ?? {}
  const sceneKeys = ['交友', '工作', '事业', '约束', '积累', '爱情', '理想']
  const [activeScene, setActiveScene] = useState('交友')
  return (
    <div>
      <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">{t('tab3')}</p>
      <h2 className="text-lg font-medium mb-6">{t('title3')}</h2>
      <div className="flex gap-2 flex-wrap mb-6">
        {sceneKeys.map(key => (
          <button
            key={key}
            onClick={() => setActiveScene(key)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              activeScene === key
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/50'
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-foreground/80">{scenes[activeScene] || ''}</p>
    </div>
  )
}

function Theme4({ data, t }: { data: any; t: any }) {
  const optimData = data['主题四_优化'] ?? {}
  const coreConflict: string = optimData['核心矛盾'] ?? ''
  const selfAlign: string = optimData['人生自洽建议'] ?? ''
  const targeted: Record<string, string> = optimData['针对性优化'] ?? {}
  return (
    <div>
      <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">{t('tab4')}</p>
      <h2 className="text-lg font-medium mb-6">{t('title4')}</h2>
      <div className="border border-border rounded-md px-4 py-3 mb-6">
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">{t('coreConflict')}</p>
        <p className="text-sm font-medium text-foreground leading-relaxed">{coreConflict}</p>
      </div>
      <p className="text-sm leading-relaxed text-foreground/80 mb-8">{selfAlign}</p>
      {Object.keys(targeted).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-4">{t('targeted')}</p>
          <div className="space-y-4">
            {Object.entries(targeted).map(([scene, content]) => (
              <div key={scene} className="border-l-2 border-border pl-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{scene}</p>
                <p className="text-sm leading-relaxed text-foreground/80">{content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}