'use client'

import { useTranslations } from 'next-intl'

const ELEMENT_COLORS: Record<string, string> = {
  Wood: '#388E3C', Fire: '#D32F2F', Earth: '#F57F17',
  Metal: '#757575', Water: '#1976D2', gray: '#6b7280',
}

const POSITIONS = ['Year', 'Month', 'Day', 'Hour'] as const
type Pos = (typeof POSITIONS)[number]
const LABEL_KEYS: Record<Pos, 'year' | 'month' | 'day' | 'hour'> = {
  Year: 'year', Month: 'month', Day: 'day', Hour: 'hour',
}
const QI_ORDER = ['BenQi', 'ZhongQi', 'YuQi']

const VW = 500
const COL_W = VW / 4  // 125

// ── 主题一总览命盘 ──────────────────────────────────────────────
// viewBox 500×250，日干有颜色，其余全部淡化（含地支）
const VH_OVERVIEW = 250
const STEM_Y_OV = 68
const BRANCH_Y_OV = 188
const SHORT_LINE_HALF = 18
const LABEL_Y_OV = 14

export function BaziOverviewChart({ calculationResult }: { calculationResult: any }) {
  const t = useTranslations('bazi')
  if (!calculationResult) return null

  const pillarsData = calculationResult.pillars
  const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
  const cangGanNodes: any[] = calculationResult.pillars?.cangGanNodes ?? []
  const dayStemNode = tianGanNodes.find((n: any) => n.pos === 'DayStem')
  const dayStemColor = ELEMENT_COLORS[dayStemNode?.wuxing ?? 'gray']

  const columns = POSITIONS.map((pos) => {
    const stemNode = tianGanNodes.find((n: any) => n.pos === `${pos}Stem`)
    const pillarEntry = pillarsData?.[pos.toLowerCase() as 'year' | 'month' | 'day' | 'hour']
    const branch: string | undefined = pillarEntry?.branch
    const benQi = cangGanNodes.find((cg: any) => cg.branchPos === `${pos}Branch` && cg.qi === 'BenQi')
    const stemColor = ELEMENT_COLORS[stemNode?.wuxing ?? 'gray']
    const branchColor = ELEMENT_COLORS[benQi?.wuxing ?? 'gray']
    const isDay = pos === 'Day'
    return { pos, stemNode, branch, stemColor, branchColor, isDay }
  })

  return (
    <svg
      width={280}
      height={140}
      viewBox={`0 0 ${VW} ${VH_OVERVIEW}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* 日干框：只有列内框，无外框 */}
      <rect
        x={COL_W * 2 + 4} y={5}
        width={COL_W - 8} height={115}
        rx={10} fill="none"
        stroke={dayStemColor} strokeWidth="1.5" opacity="0.6"
      />
      {/* 列分隔线（内框线，无外框） */}
      {[1, 2, 3].map(i => (
        <line key={i}
          x1={COL_W * i} y1={4} x2={COL_W * i} y2={VH_OVERVIEW - 4}
          stroke="hsl(var(--border))" strokeWidth="1" opacity="0.4"
        />
      ))}
      {columns.map(({ pos, stemNode, branch, stemColor, isDay }, idx) => {
        const cx = COL_W * idx + COL_W / 2
        const isUnknown = !stemNode || !branch
        return (
          <g key={pos}>
            <text x={cx} y={LABEL_Y_OV} textAnchor="middle" dominantBaseline="middle"
              fontSize="10" letterSpacing="2"
              fill="hsl(var(--muted-foreground))" opacity="0.4"
            >{t(LABEL_KEYS[pos as Pos])}</text>

            {/* 天干：只有日干有颜色 */}
            {isUnknown
              ? <text x={cx} y={STEM_Y_OV} textAnchor="middle" dominantBaseline="middle"
                  fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.15">?</text>
              : <text x={cx} y={STEM_Y_OV} textAnchor="middle" dominantBaseline="middle"
                  fontSize="34"
                  fill={isDay ? stemColor : 'hsl(var(--muted-foreground))'}
                  opacity={isDay ? 1 : 0.18}
                >{stemNode?.stem ? t(`tiangan.${stemNode.stem}`) : '?'}</text>
            }

            <line x1={cx - SHORT_LINE_HALF} y1={125} x2={cx + SHORT_LINE_HALF} y2={125}
              stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />

            {/* 地支：全部淡化，包括日支 */}
            {isUnknown
              ? <text x={cx} y={BRANCH_Y_OV} textAnchor="middle" dominantBaseline="middle"
                  fontSize="46" fill="hsl(var(--muted-foreground))" opacity="0.15">?</text>
              : <text x={cx} y={BRANCH_Y_OV} textAnchor="middle" dominantBaseline="middle"
                  fontSize="34"
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.18}
                >{branch ? t(`dizhi.${branch}`) : '?'}</text>
            }
          </g>
        )
      })}
    </svg>
  )
}

// ── 节点图共用常量 ──────────────────────────────────────────────
const VH_NODE = 375
const ROW_H = 125
const STEM_Y = ROW_H / 2        // 62.5  天干行中心
const BRANCH_Y = ROW_H * 1.5   // 187.5 地支行中心
const CANG_Y = ROW_H * 2.5     // 312.5 藏干行中心
const FONT_SIZE = 36
const BOX_SIZE = 72
const BOX_R = 10

// 宫位→列号
const LABEL_TO_COL: Record<string, number> = {
  '年干': 0, '月干': 1, '日干': 2, '时干': 3,
  '年支': 0, '月支': 1, '日支': 2, '时支': 3,
  '年支藏干': 0, '月支藏干': 1, '日支藏干': 2, '时支藏干': 3,
}
type RowType = 'stem' | 'branch' | 'cang'
const LABEL_TO_ROW: Record<string, RowType> = {
  '年干': 'stem', '月干': 'stem', '日干': 'stem', '时干': 'stem',
  '年支': 'branch', '月支': 'branch', '日支': 'branch', '时支': 'branch',
  '年支藏干': 'cang', '月支藏干': 'cang', '日支藏干': 'cang', '时支藏干': 'cang',
}

function nodeCenter(label: string): { x: number; y: number } | null {
  const col = LABEL_TO_COL[label]
  const row = LABEL_TO_ROW[label]
  if (col === undefined || !row) return null
  const x = COL_W * col + COL_W / 2
  const y = row === 'stem' ? STEM_Y : row === 'branch' ? BRANCH_Y : CANG_Y
  return { x, y }
}

// 折线路径（直角转弯）
// 天干→藏干（通根）：天干底部→自坐地支中心→横向→目标地支中心→藏干顶部
// 藏干→天干（透出）：藏干顶部→所在地支中心→横向→目标地支中心→天干底部
function buildPath(fromLabel: string, toLabel: string): string {
  const fromCol = LABEL_TO_COL[fromLabel]
  const toCol = LABEL_TO_COL[toLabel]
  const fromRow = LABEL_TO_ROW[fromLabel]
  const toRow = LABEL_TO_ROW[toLabel]
  if (fromCol === undefined || toCol === undefined || !fromRow || !toRow) return ''

  const fromCx = COL_W * fromCol + COL_W / 2
  const toCx = COL_W * toCol + COL_W / 2

  if (fromRow === 'stem' && toRow === 'cang') {
    // 天干→藏干（通根）
    return [
      `M ${fromCx} ${STEM_Y + FONT_SIZE / 2}`,
      `L ${fromCx} ${BRANCH_Y}`,
      `L ${toCx} ${BRANCH_Y}`,
      `L ${toCx} ${CANG_Y - FONT_SIZE / 2}`,
    ].join(' ')
  }
  if (fromRow === 'cang' && toRow === 'stem') {
    // 藏干→天干（透出）
    return [
      `M ${fromCx} ${CANG_Y - FONT_SIZE / 2}`,
      `L ${fromCx} ${BRANCH_Y}`,
      `L ${toCx} ${BRANCH_Y}`,
      `L ${toCx} ${STEM_Y + FONT_SIZE / 2}`,
    ].join(' ')
  }
  // 天干↔天干 / 地支↔地支（机制交互）：直线
  const fromY = fromRow === 'stem' ? STEM_Y : fromRow === 'branch' ? BRANCH_Y : CANG_Y
  const toY = toRow === 'stem' ? STEM_Y : toRow === 'branch' ? BRANCH_Y : CANG_Y
  return `M ${fromCx} ${fromY} L ${toCx} ${toY}`
}

// 找五行匹配的藏干（用于连线目标——只要五行相同即可）
function findMatchingCangGan(
  branchPosKey: string,
  shishenWuxing: string,
  cangGanNodes: any[],
): any | null {
  const candidates = cangGanNodes
    .filter((cg: any) => cg.branchPos === branchPosKey && cg.wuxing === shishenWuxing)
    .sort((a: any, b: any) => QI_ORDER.indexOf(a.qi) - QI_ORDER.indexOf(b.qi))
  return candidates[0] ?? null
}

// 找阴阳五行完全一致的藏干（用于方框——只框与该十神完全一致的节点）
function findExactCangGan(
  branchPosKey: string,
  shishenWuxing: string,
  shishenYinyang: string,
  cangGanNodes: any[],
): any | null {
  const candidates = cangGanNodes
    .filter((cg: any) =>
      cg.branchPos === branchPosKey &&
      cg.wuxing === shishenWuxing &&
      cg.yinyang === shishenYinyang
    )
    .sort((a: any, b: any) => QI_ORDER.indexOf(a.qi) - QI_ORDER.indexOf(b.qi))
  return candidates[0] ?? null
}

// 找阴阳五行完全一致的天干（用于透出目标方框判断）
function isExactStemMatch(
  stemPosKey: string,
  shishenWuxing: string,
  shishenYinyang: string,
  tianGanNodes: any[],
): boolean {
  const node = tianGanNodes.find((n: any) => n.pos === stemPosKey)
  if (!node) return false
  return node.wuxing === shishenWuxing && node.yinyang === shishenYinyang
}

const BRANCH_LABEL_TO_POS: Record<string, string> = {
  '年支': 'YearBranch', '月支': 'MonthBranch', '日支': 'DayBranch', '时支': 'HourBranch',
}
const STEM_LABEL_TO_POS: Record<string, string> = {
  '年干': 'YearStem', '月干': 'MonthStem', '日干': 'DayStem', '时干': 'HourStem',
}

// 解析metaLines，提取连接关系和节点状态
interface NodeState {
  boxed: Set<string>   // 有方框（阴阳五行完全一致）
  colored: Set<string> // 有颜色无方框（五行相同但阴阳不同，或地支被穿过）
  locked: Set<string>  // 墓库锁闭（虚线框）
}

interface Connection {
  fromLabel: string  // 天干 or 藏干label
  toLabel: string    // 藏干 or 天干label
}

function parseMetaLines(
  metaLines: string[],
  shishenWuxing: string,
  shishenYinyang: string,
  cangGanNodes: any[],
  tianGanNodes: any[],
): {
  nodeState: NodeState
  connections: Connection[]
} {
  const boxed = new Set<string>()
  const colored = new Set<string>()
  const locked = new Set<string>()
  const connections: Connection[] = []

  for (const line of metaLines) {
    // 墓库锁闭
    if (line.includes('墓库锁闭')) {
      const branchLabel = line.split('：')[0].trim()
      const branchPos = BRANCH_LABEL_TO_POS[branchLabel]
      if (branchPos) {
        const cg = findMatchingCangGan(branchPos, shishenWuxing, cangGanNodes)
        if (cg) locked.add(`${branchLabel}藏干`)
      }
      continue
    }

    // 通根：月干：通根→年支 月支
    const touGenMatch = line.match(/^(.+?)：通根→(.+)$/)
    if (touGenMatch) {
      const stemLabel = touGenMatch[1].trim()
      const stemPos = STEM_LABEL_TO_POS[stemLabel]
      // 天干：完全一致→boxed，五行同阴阳不同→colored
      if (stemPos) {
        const exact = isExactStemMatch(stemPos, shishenWuxing, shishenYinyang, tianGanNodes)
        if (exact) boxed.add(stemLabel)
        else colored.add(stemLabel)
      }
      const targets = touGenMatch[2].trim().split(/\s+/)
      for (const branchLabel of targets) {
        const branchPos = BRANCH_LABEL_TO_POS[branchLabel]
        if (!branchPos) continue
        // 地支：不加colored，连线穿过但保持淡化
        // 藏干：完全一致→boxed，五行同阴阳不同→colored
        const cgAny = findMatchingCangGan(branchPos, shishenWuxing, cangGanNodes)
        if (!cgAny) continue
        const cangLabel = `${branchLabel}藏干`
        const cgExact = findExactCangGan(branchPos, shishenWuxing, shishenYinyang, cangGanNodes)
        if (cgExact) boxed.add(cangLabel)
        else colored.add(cangLabel)
        connections.push({ fromLabel: stemLabel, toLabel: cangLabel })
      }
      continue
    }

    // 无通根：天干本身有颜色，框线取决于阴阳
    if (line.includes('无通根')) {
      const stemLabel = line.split('：')[0].trim()
      const stemPos = STEM_LABEL_TO_POS[stemLabel]
      if (stemPos) {
        const exact = isExactStemMatch(stemPos, shishenWuxing, shishenYinyang, tianGanNodes)
        if (exact) boxed.add(stemLabel)
        else colored.add(stemLabel)
      }
      continue
    }

    // 透出：月支：透出→月干
    const touChuMatch = line.match(/^(.+?)：透出→(.+)$/)
    if (touChuMatch) {
      const branchLabel = touChuMatch[1].trim()
      const stemLabel = touChuMatch[2].trim()
      const branchPos = BRANCH_LABEL_TO_POS[branchLabel]
      if (branchPos) {
        const cgAny = findMatchingCangGan(branchPos, shishenWuxing, cangGanNodes)
        if (cgAny) {
          // 地支：不加colored，连线穿过但保持淡化
          // 藏干：完全一致→boxed，否则→colored
          const cangLabel = `${branchLabel}藏干`
          const cgExact = findExactCangGan(branchPos, shishenWuxing, shishenYinyang, cangGanNodes)
          if (cgExact) boxed.add(cangLabel)
          else colored.add(cangLabel)
          // 目标天干：完全一致→boxed，否则→colored
          const stemPos = STEM_LABEL_TO_POS[stemLabel]
          if (stemPos) {
            const exact = isExactStemMatch(stemPos, shishenWuxing, shishenYinyang, tianGanNodes)
            if (exact) boxed.add(stemLabel)
            else colored.add(stemLabel)
          }
          connections.push({ fromLabel: cangLabel, toLabel: stemLabel })
        }
      }
      continue
    }

    // 未透出：藏干有颜色，框线取决于阴阳，地支淡化
    if (line.includes('未透出')) {
      const branchLabel = line.split('：')[0].trim()
      const branchPos = BRANCH_LABEL_TO_POS[branchLabel]
      if (branchPos) {
        // 地支不加colored，保持淡化
        const cangLabel = `${branchLabel}藏干`
        const cgExact = findExactCangGan(branchPos, shishenWuxing, shishenYinyang, cangGanNodes)
        if (cgExact) boxed.add(cangLabel)
        else colored.add(cangLabel)
      }
      continue
    }
  }

  return { nodeState: { boxed, colored, locked }, connections }
}

// 获取节点显示文字和颜色
function getNodeText(
  label: string,
  calculationResult: any,
  shishenWuxing: string,
  t: any,
): { text: string; color: string } {
  const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
  const cangGanNodes: any[] = calculationResult.pillars?.cangGanNodes ?? []
  const pillarsData = calculationResult.pillars

  // 天干
  const stemPos = STEM_LABEL_TO_POS[label]
  if (stemPos) {
    const node = tianGanNodes.find((n: any) => n.pos === stemPos)
    if (!node) return { text: '?', color: ELEMENT_COLORS['gray'] }
    return {
      text: node.stem ? t(`tiangan.${node.stem}`) : '?',
      color: ELEMENT_COLORS[node.wuxing ?? 'gray'],
    }
  }

  // 地支
  const branchPos = BRANCH_LABEL_TO_POS[label]
  if (branchPos) {
    const posKey = branchPos.replace('Branch', '').toLowerCase() as 'year' | 'month' | 'day' | 'hour'
    const branch = pillarsData?.[posKey]?.branch
    const benQi = cangGanNodes.find((cg: any) => cg.branchPos === branchPos && cg.qi === 'BenQi')
    return {
      text: branch ? t(`dizhi.${branch}`) : '?',
      color: ELEMENT_COLORS[benQi?.wuxing ?? 'gray'],
    }
  }

  // 藏干：找五行匹配的藏干
  if (label.endsWith('藏干')) {
    const branchLabel = label.replace('藏干', '')
    const bPos = BRANCH_LABEL_TO_POS[branchLabel]
    if (!bPos) return { text: '?', color: ELEMENT_COLORS['gray'] }
    const cg = findMatchingCangGan(bPos, shishenWuxing, cangGanNodes)
    if (!cg) return { text: '?', color: ELEMENT_COLORS['gray'] }
    return {
      text: cg.stem ? t(`tiangan.${cg.stem}`) : '?',
      color: ELEMENT_COLORS[cg.wuxing ?? 'gray'],
    }
  }

  return { text: '?', color: ELEMENT_COLORS['gray'] }
}

const ALL_STEM_LABELS = ['年干', '月干', '日干', '时干']
const ALL_BRANCH_LABELS = ['年支', '月支', '日支', '时支']
const ALL_CANG_LABELS = ['年支藏干', '月支藏干', '日支藏干', '时支藏干']

// ── 主题二十神节点图 ──────────────────────────────────────────
export function BaziShishenChart({
  calculationResult,
  metaLines,
  shishenColor,
  shishenWuxing,
  shishenYinyang,
}: {
  calculationResult: any
  metaLines: string[]
  shishenColor: string
  shishenWuxing: string
  shishenYinyang: string
}) {
  const t = useTranslations('bazi')
  if (!calculationResult || metaLines[0] === '（无节点）') return null

  const cangGanNodes: any[] = calculationResult.pillars?.cangGanNodes ?? []
  const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
  const { nodeState, connections } = parseMetaLines(metaLines, shishenWuxing, shishenYinyang, cangGanNodes, tianGanNodes)
  const { boxed, colored, locked } = nodeState

  return (
    <svg
      width={280}
      height={210}
      viewBox={`0 0 ${VW} ${VH_NODE}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* 行分隔线 */}
      {[1, 2].map(i => (
        <line key={i}
          x1={0} y1={ROW_H * i} x2={VW} y2={ROW_H * i}
          stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2"
        />
      ))}
      {/* 列分隔线 */}
      {[1, 2, 3].map(i => (
        <line key={i}
          x1={COL_W * i} y1={0} x2={COL_W * i} y2={VH_NODE}
          stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2"
        />
      ))}

      {/* 连线（在节点下层） */}
      {connections.map((conn, i) => {
        const path = buildPath(conn.fromLabel, conn.toLabel)
        if (!path) return null
        return (
          <path key={i}
            d={path}
            stroke={shishenColor}
            strokeWidth="3"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}

      {/* 天干节点 */}
      {ALL_STEM_LABELS.map((label) => {
        const center = nodeCenter(label)
        if (!center) return null
        const isBoxed = boxed.has(label)
        const isColored = colored.has(label)
        const isActive = isBoxed || isColored
        const { text, color } = getNodeText(label, calculationResult, shishenWuxing, t)
        return (
          <g key={label}>
            {isBoxed && (
              <rect
                x={center.x - BOX_SIZE / 2} y={center.y - BOX_SIZE / 2}
                width={BOX_SIZE} height={BOX_SIZE}
                rx={BOX_R} fill="none"
                stroke={shishenColor} strokeWidth="2" opacity="0.9"
              />
            )}
            <text x={center.x} y={center.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={FONT_SIZE}
              fill={isActive ? color : 'hsl(var(--muted-foreground))'}
              opacity={isActive ? 1 : 0.1}
            >{text}</text>
          </g>
        )
      })}

      {/* 地支节点：全部淡化，仅作结构占位 */}
      {ALL_BRANCH_LABELS.map((label) => {
        const center = nodeCenter(label)
        if (!center) return null
        const { text } = getNodeText(label, calculationResult, shishenWuxing, t)
        return (
          <text key={label} x={center.x} y={center.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fill="hsl(var(--muted-foreground))"
            opacity={0.1}
          >{text}</text>
        )
      })}

      {/* 藏干节点：boxed=框+颜色，colored=颜色无框，locked=虚线框，其余不显示 */}
      {ALL_CANG_LABELS.map((label) => {
        const center = nodeCenter(label)
        if (!center) return null
        const isBoxed = boxed.has(label)
        const isColored = colored.has(label)
        const isLocked = locked.has(label)
        const isVisible = isBoxed || isColored || isLocked
        if (!isVisible) return null
        const { text, color } = getNodeText(label, calculationResult, shishenWuxing, t)
        return (
          <g key={label}>
            {(isBoxed || isLocked) && (
              <rect
                x={center.x - BOX_SIZE / 2} y={center.y - BOX_SIZE / 2}
                width={BOX_SIZE} height={BOX_SIZE}
                rx={BOX_R} fill="none"
                stroke={shishenColor} strokeWidth="2"
                opacity={isLocked ? 0.5 : 0.9}
                strokeDasharray={isLocked ? '6 4' : undefined}
              />
            )}
            <text x={center.x} y={center.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={FONT_SIZE}
              fill={color}
              opacity={isLocked ? 0.5 : 1}
            >{text}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── 机制交互节点图 ──────────────────────────────────────────────
// 连线黑色，方框按各自五行色
export function BaziInteractionChart({
  calculationResult,
  relation,
}: {
  calculationResult: any
  relation: string
}) {
  const t = useTranslations('bazi')
  if (!calculationResult) return null

  const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
  const cangGanNodes: any[] = calculationResult.pillars?.cangGanNodes ?? []
  const pillarsData = calculationResult.pillars

  // 从关系字符串里找涉及的天干/地支宫位
  const activeLabels = new Set<string>()
  for (const label of [...ALL_STEM_LABELS, ...ALL_BRANCH_LABELS]) {
    if (relation.includes(label)) activeLabels.add(label)
  }

  function getLabelColor(label: string): string {
    const stemPos = STEM_LABEL_TO_POS[label]
    if (stemPos) {
      const node = tianGanNodes.find((n: any) => n.pos === stemPos)
      return ELEMENT_COLORS[node?.wuxing ?? 'gray']
    }
    const branchPos = BRANCH_LABEL_TO_POS[label]
    if (branchPos) {
      const benQi = cangGanNodes.find((cg: any) => cg.branchPos === branchPos && cg.qi === 'BenQi')
      return ELEMENT_COLORS[benQi?.wuxing ?? 'gray']
    }
    return ELEMENT_COLORS['gray']
  }

  function getLabelText(label: string): string {
    const stemPos = STEM_LABEL_TO_POS[label]
    if (stemPos) {
      const node = tianGanNodes.find((n: any) => n.pos === stemPos)
      return node?.stem ? t(`tiangan.${node.stem}`) : '?'
    }
    const branchPos = BRANCH_LABEL_TO_POS[label]
    if (branchPos) {
      const posKey = branchPos.replace('Branch', '').toLowerCase() as 'year' | 'month' | 'day' | 'hour'
      const branch = pillarsData?.[posKey]?.branch
      return branch ? t(`dizhi.${branch}`) : '?'
    }
    return '?'
  }

  // active节点坐标，用于连线
  const activeCoords = [...activeLabels]
    .map(label => nodeCenter(label))
    .filter(Boolean) as { x: number; y: number }[]

  return (
    <svg
      width={280}
      height={210}
      viewBox={`0 0 ${VW} ${VH_NODE}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* 行分隔线（只显示天干/地支行分隔，藏干行不用，因为不显示藏干） */}
      <line x1={0} y1={ROW_H} x2={VW} y2={ROW_H}
        stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2" />
      {/* 列分隔线 */}
      {[1, 2, 3].map(i => (
        <line key={i}
          x1={COL_W * i} y1={0} x2={COL_W * i} y2={ROW_H * 2}
          stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2"
        />
      ))}

      {/* 连线：黑色（用foreground颜色），直线 */}
      {activeCoords.length >= 2 && (
        <line
          x1={activeCoords[0].x} y1={activeCoords[0].y}
          x2={activeCoords[1].x} y2={activeCoords[1].y}
          stroke="hsl(var(--foreground))"
          strokeWidth="3" opacity="0.6" strokeLinecap="round"
        />
      )}

      {/* 天干节点：参与关系→颜色+方框，不参与→淡化 */}
      {ALL_STEM_LABELS.map((label) => {
        const center = nodeCenter(label)
        if (!center) return null
        const isActive = activeLabels.has(label)
        const color = getLabelColor(label)
        const text = getLabelText(label)
        return (
          <g key={label}>
            {isActive && (
              <rect
                x={center.x - BOX_SIZE / 2} y={center.y - BOX_SIZE / 2}
                width={BOX_SIZE} height={BOX_SIZE}
                rx={BOX_R} fill="none"
                stroke={color} strokeWidth="2" opacity="0.9"
              />
            )}
            <text x={center.x} y={center.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={FONT_SIZE}
              fill={isActive ? color : 'hsl(var(--muted-foreground))'}
              opacity={isActive ? 1 : 0.1}
            >{text}</text>
          </g>
        )
      })}

      {/* 地支节点：参与关系→颜色+方框，不参与→淡化 */}
      {ALL_BRANCH_LABELS.map((label) => {
        const center = nodeCenter(label)
        if (!center) return null
        const isActive = activeLabels.has(label)
        const color = getLabelColor(label)
        const text = getLabelText(label)
        return (
          <g key={label}>
            {isActive && (
              <rect
                x={center.x - BOX_SIZE / 2} y={center.y - BOX_SIZE / 2}
                width={BOX_SIZE} height={BOX_SIZE}
                rx={BOX_R} fill="none"
                stroke={color} strokeWidth="2" opacity="0.9"
              />
            )}
            <text x={center.x} y={center.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={FONT_SIZE}
              fill={isActive ? color : 'hsl(var(--muted-foreground))'}
              opacity={isActive ? 1 : 0.1}
            >{text}</text>
          </g>
        )
      })}
    </svg>
  )
}