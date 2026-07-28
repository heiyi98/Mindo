'use client'

import React from 'react'

const FONT_CONFIGS: Record<string, { name: string; regular: string; bold: string }> = {
  zh: {
    name: 'SourceHanSansCN',
    regular: '/fonts/source-han-sans-ttf/SourceHanSansCN-Regular.ttf',
    bold: '/fonts/source-han-sans-ttf/SourceHanSansCN-Bold.ttf',
  },
  'zh-Hant': {
    name: 'SourceHanSansTW',
    regular: '/fonts/source-han-sans-ttf/SourceHanSansTW-Regular.ttf',
    bold: '/fonts/source-han-sans-ttf/SourceHanSansTW-Bold.ttf',
  },
  ja: {
    name: 'SourceHanSansJP',
    regular: '/fonts/source-han-sans-ttf/SourceHanSansJP-Regular.ttf',
    bold: '/fonts/source-han-sans-ttf/SourceHanSansJP-Bold.ttf',
  },
  ko: {
    name: 'SourceHanSansKR',
    regular: '/fonts/source-han-sans-ttf/SourceHanSansKR-Regular.ttf',
    bold: '/fonts/source-han-sans-ttf/SourceHanSansKR-Bold.ttf',
  },
  default: {
    name: 'SourceSans3',
    regular: '/fonts/source-han-sans-ttf/SourceSans3-Regular.ttf',
    bold: '/fonts/source-han-sans-ttf/SourceSans3-Bold.ttf',
  },
}

async function captureElement(el: HTMLElement): Promise<string> {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  })
  return canvas.toDataURL('image/png')
}

export function usePdfExport(locale: string) {
  const exportPdf = async (
    data: {
      theme1: any
      theme2: any
      theme3: any
      theme4: any
      dayStemZH: string
      shishenMetadata: Record<string, string[]>
    },
    chartRefs: {
      overviewRef: React.RefObject<HTMLDivElement | null>
      shishenRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
      interactionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
    }
  ) => {
    // 1. 截图所有命盘
    const overviewImg = chartRefs.overviewRef.current
      ? await captureElement(chartRefs.overviewRef.current)
      : null

    const shishenImgs: Record<string, string> = {}
    for (const [key, el] of Object.entries(chartRefs.shishenRefs.current)) {
      if (el) shishenImgs[key] = await captureElement(el)
    }

    const interactionImgs: string[] = []
    for (const el of chartRefs.interactionRefs.current) {
      interactionImgs.push(el ? await captureElement(el) : '')
    }

    // 2. 动态import（避免SSR问题）
    const { pdf, Document, Page, Text, View, Image, Font, StyleSheet } =
      await import('@react-pdf/renderer')

    // 3. 注册字体（用完整URL，@react-pdf/renderer在浏览器端需要完整URL）
    const fontConfig = FONT_CONFIGS[locale] ?? FONT_CONFIGS['default']
    const origin = window.location.origin
    // 加时间戳强制每次重新注册，避免缓存问题
    const fontFamily = `${fontConfig.name}-${Date.now()}`
    Font.register({
      family: fontFamily,
      fonts: [
        { src: `${origin}${fontConfig.regular}`, fontWeight: 'normal' },
        { src: `${origin}${fontConfig.bold}`, fontWeight: 'bold' },
      ],
    })

    // 允许中文换行，同时消除行尾的连字符（-）
    Font.registerHyphenationCallback((word) => {
      if (word.length === 1) return [word]
      return Array.from(word).flatMap((char) => [char, ''])
    })

    // 4. 样式
    const pdfStyles = StyleSheet.create({
      page: {
        fontFamily: fontFamily,
        fontSize: 10,
        paddingTop: 48,
        paddingBottom: 48,
        paddingLeft: 56,
        paddingRight: 56,
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        lineHeight: 1.7,
      },
      sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#111111',
        letterSpacing: 1,
        width: 483,
      },
      dayStem: {
        fontSize: 9,
        color: '#888888',
        marginBottom: 16,
      },
      overviewRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'flex-start' as const,
        marginBottom: 16,
      },
      overviewTitleBlock: {
        flex: 1,
      },
      overviewChart: {
        width: 140,
        height: 70,
      },
      paragraph: {
        fontSize: 10,
        color: '#333333',
        marginBottom: 10,
        lineHeight: 1.8,
        width: 483,
      },
      subsectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111111',
        marginBottom: 4,
      },
      metaLine: {
        fontSize: 8,
        color: '#888888',
        marginBottom: 2,
      },
      chartRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'flex-start' as const,
        marginBottom: 8,
      },
      chartLeft: {
        flex: 1,
        marginRight: 12,
      },
      shishenChart: {
        width: 140,
        height: 105,
      },
      shortDivider: {
        borderTopWidth: 0.5,
        borderTopColor: '#dddddd',
        marginVertical: 14,
        width: 32,
      },
      longDivider: {
        borderTopWidth: 0.5,
        borderTopColor: '#cccccc',
        marginVertical: 18,
      },
      interactionSubTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111111',
        marginBottom: 12,
        marginTop: 4,
      },
      interactionLabel: {
        fontSize: 8,
        color: '#888888',
        marginBottom: 4,
        flex: 1,
        marginRight: 12,
      },
      sceneTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111111',
        marginBottom: 6,
      },
      labelTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#888888',
        marginBottom: 6,
        letterSpacing: 0.5,
      },
      fullWidth: {
        width: 483,
      },
    })

    // 5. 准备数据
    const theme1Text: string = data.theme1?.['主题一_人格核心'] ?? ''
    const theme1Paragraphs = theme1Text.split('\n\n').filter(Boolean)

    const mechanisms: any[] = data.theme2?.['主题二_内部机制'] ?? []
    const interactions: any[] = data.theme2?.['机制交互'] ?? []

    const scenes: Record<string, string> = data.theme3?.['主题三_现实反应'] ?? {}
    const sceneKeys = ['交友', '工作', '事业', '约束', '积累', '爱情', '理想']
    const validScenes = sceneKeys.filter(k => scenes[k])

    const optimData = data.theme4?.['主题四_优化'] ?? {}
    const coreConflict: string = optimData['核心矛盾'] ?? ''
    const selfAlign: string = optimData['人生自洽建议'] ?? ''
    const targeted: Record<string, string> = optimData['针对性优化'] ?? {}
    const targetedEntries = Object.entries(targeted).filter(([, v]) => v)

    // 6. PDF文档
    const MyDoc = () => (
      <Document>
        {/* 第一页：人格核心 */}
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.overviewRow}>
            <View style={pdfStyles.overviewTitleBlock}>
              <Text style={pdfStyles.sectionTitle}>人格核心</Text>
              {data.dayStemZH ? <Text style={pdfStyles.dayStem}>日主：{data.dayStemZH}</Text> : null}
            </View>
            {overviewImg ? <Image style={pdfStyles.overviewChart} src={overviewImg} /> : null}
          </View>
          {theme1Paragraphs.map((p, i) => (
            <Text key={i} style={pdfStyles.paragraph}>{p}</Text>
          ))}
        </Page>

        {/* 第二页：心理机制 */}
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.sectionTitle}>心理机制</Text>
          {mechanisms.map((m, i) => {
            const label: string = m['机制标签'] ?? ''
            const metaLines: string[] = data.shishenMetadata[label] ?? []
            const hasValidMeta = metaLines.length > 0 && metaLines[0] !== '（无节点）'
            const chartImg = shishenImgs[label]
            return (
              <View key={i} style={pdfStyles.fullWidth}>
                <View style={pdfStyles.chartRow} wrap={false}>
                  <View style={pdfStyles.chartLeft}>
                    <Text style={pdfStyles.subsectionTitle}>{label}</Text>
                    {hasValidMeta && metaLines.map((line, j) => (
                      <Text key={j} style={pdfStyles.metaLine}>{line}</Text>
                    ))}
                  </View>
                  {chartImg ? <Image style={pdfStyles.shishenChart} src={chartImg} /> : null}
                </View>
                <Text style={pdfStyles.paragraph}>{m['解析'] ?? ''}</Text>
                {i < mechanisms.length - 1 ? <View style={pdfStyles.shortDivider} /> : null}
              </View>
            )
          })}
          {interactions.length > 0 && (
            <>
              <View style={pdfStyles.longDivider} />
              <Text style={pdfStyles.interactionSubTitle}>机制交互</Text>
              {interactions.map((item, i) => {
                const chartImg = interactionImgs[i]
                return (
                  <View key={i} style={pdfStyles.fullWidth}>
                    <View style={pdfStyles.chartRow} wrap={false}>
                      <Text style={pdfStyles.interactionLabel}>{item['关系'] ?? ''}</Text>
                      {chartImg ? <Image style={pdfStyles.shishenChart} src={chartImg} /> : null}
                    </View>
                    <Text style={pdfStyles.paragraph}>{item['解析'] ?? ''}</Text>
                    {i < interactions.length - 1 ? <View style={pdfStyles.shortDivider} /> : null}
                  </View>
                )
              })}
            </>
          )}
        </Page>

        {/* 第三页：现实反应 */}
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.sectionTitle}>现实反应</Text>
          {validScenes.map((key, i) => (
            <View key={key} style={pdfStyles.fullWidth}>
              <Text style={pdfStyles.sceneTitle}>{key}</Text>
              <Text style={pdfStyles.paragraph}>{scenes[key]}</Text>
              {i < validScenes.length - 1 ? <View style={pdfStyles.shortDivider} /> : null}
            </View>
          ))}
        </Page>

        {/* 第四页：调优建议 */}
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.sectionTitle}>调优建议</Text>
          {coreConflict ? (
            <View wrap={false}>
              <Text style={pdfStyles.labelTitle}>核心矛盾</Text>
              <Text style={pdfStyles.paragraph}>{coreConflict}</Text>
            </View>
          ) : null}
          {coreConflict && selfAlign ? <View style={pdfStyles.shortDivider} /> : null}
          {selfAlign ? (
            <View wrap={false}>
              <Text style={pdfStyles.labelTitle}>人生自洽建议</Text>
              <Text style={pdfStyles.paragraph}>{selfAlign}</Text>
            </View>
          ) : null}
          {targetedEntries.length > 0 ? <View style={pdfStyles.longDivider} /> : null}
          {targetedEntries.length > 0 ? (
            <>
              <Text style={pdfStyles.labelTitle}>针对性优化</Text>
              {targetedEntries.map(([scene, content], i) => (
                <View key={scene} style={pdfStyles.fullWidth}>
                  <Text style={pdfStyles.sceneTitle}>{scene}</Text>
                  <Text style={pdfStyles.paragraph}>{content}</Text>
                  {i < targetedEntries.length - 1 ? <View style={pdfStyles.shortDivider} /> : null}
                </View>
              ))}
            </>
          ) : null}
        </Page>
      </Document>
    )

    // 7. 生成并下载
    const blob = await pdf(<MyDoc />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '命都报告.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  return { exportPdf }
}