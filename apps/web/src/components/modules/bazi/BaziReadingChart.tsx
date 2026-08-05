'use client'

import { useTranslations } from 'next-intl'
import type { ShishenNodeRelation, GanZhiRelation } from '@/lib/bazi/reportRelations'

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
// 本组件未涉及本轮改动，逻辑与原文件完全一致
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
      <rect
        x={COL_W * 2 + 4} y={5}
        width={COL_W - 8} height={115}
        rx={10} fill="none"
        stroke={dayStemColor} strokeWidth="1.5" opacity="0.6"
      />
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
const STEM_Y = ROW_H / 2
const BRANCH_Y = ROW_H * 1.5
const CANG_Y = ROW_H * 2.5
const FONT_SIZE = 36
const BOX_SIZE = 72
const BOX_R = 10

// ══════════════════════════════════════════════════════════════
// 英文位置体系——BaziShishenChart 和 BaziInteractionChart 共用
// ══════════════════════════════════════════════════════════════

const STEM_POSITIONS = ['YearStem', 'MonthStem', 'DayStem', 'HourStem'] as const
const BRANCH_POSITIONS = ['YearBranch', 'MonthBranch', 'DayBranch', 'HourBranch'] as const

function colIndexOf(pos: string): number {
  if (pos.startsWith('Year')) return 0
  if (pos.startsWith('Month')) return 1
  if (pos.startsWith('Day')) return 2
  return 3
}

function rowOf(pos: string): 'stem' | 'branch' {
  return pos.endsWith('Stem') ? 'stem' : 'branch'
}

function nodeCenterByPos(pos: string, row: 'stem' | 'branch' | 'cang'): { x: number; y: number } {
  const col = colIndexOf(pos)
  const x = COL_W * col + COL_W / 2
  const y = row === 'stem' ? STEM_Y : row === 'branch' ? BRANCH_Y : CANG_Y
  return { x, y }
}

// 折线路径（直角转弯），仅处理 天干↔藏干 两种组合（BaziShishenChart唯一用到的情形）
function buildPath(
  fromPos: string, fromRow: 'stem' | 'cang',
  toPos: string, toRow: 'stem' | 'cang',
): string {
  const fromCx = COL_W * colIndexOf(fromPos) + COL_W / 2
  const toCx = COL_W * colIndexOf(toPos) + COL_W / 2

  if (fromRow === 'stem' && toRow === 'cang') {
    return [
      `M ${fromCx} ${STEM_Y + FONT_SIZE / 2}`,
      `L ${fromCx} ${BRANCH_Y}`,
      `L ${toCx} ${BRANCH_Y}`,
      `L ${toCx} ${CANG_Y - FONT_SIZE / 2}`,
    ].join(' ')
  }
  return [
    `M ${fromCx} ${CANG_Y - FONT_SIZE / 2}`,
    `L ${fromCx} ${BRANCH_Y}`,
    `L ${toCx} ${BRANCH_Y}`,
    `L ${toCx} ${STEM_Y + FONT_SIZE / 2}`,
  ].join(' ')
}

function findMatchingCangGan(branchPosKey: string, shishenWuxing: string, cangGanNodes: any[]): any | null {
  const candidates = cangGanNodes
    .filter((cg: any) => cg.branchPos === branchPosKey && cg.wuxing === shishenWuxing)
    .sort((a: any, b: any) => QI_ORDER.indexOf(a.qi) - QI_ORDER.indexOf(b.qi))
  return candidates[0] ?? null
}

function findExactCangGan(
  branchPosKey: string, shishenWuxing: string, shishenYinyang: string, cangGanNodes: any[],
): any | null {
  const candidates = cangGanNodes
    .filter((cg: any) =>
      cg.branchPos === branchPosKey && cg.wuxing === shishenWuxing && cg.yinyang === shishenYinyang
    )
    .sort((a: any, b: any) => QI_ORDER.indexOf(a.qi) - QI_ORDER.indexOf(b.qi))
  return candidates[0] ?? null
}

function isExactStemMatch(
  stemPosKey: string, shishenWuxing: string, shishenYinyang: string, tianGanNodes: any[],
): boolean {
  const node = tianGanNodes.find((n: any) => n.pos === stemPosKey)
  if (!node) return false
  return node.wuxing === shishenWuxing && node.yinyang === shishenYinyang
}

interface NodeState {
  boxed: Set<string>
  colored: Set<string>
  locked: Set<string>
}
interface Connection {
  fromPos: string; fromRow: 'stem' | 'cang'
  toPos: string; toRow: 'stem' | 'cang'
}

function keyOf(pos: string, row: 'stem' | 'cang'): string {
  return `${pos}#${row}`
}

function parseRelations(
  relations: ShishenNodeRelation[],
  shishenWuxing: string,
  shishenYinyang: string,
  cangGanNodes: any[],
  tianGanNodes: any[],
): { nodeState: NodeState; connections: Connection[] } {
  const boxed = new Set<string>()
  const colored = new Set<string>()
  const locked = new Set<string>()
  const connections: Connection[] = []

  for (const rel of relations) {
    if (rel.nodeType === 'CangGan' && rel.kind === 'MuKuLocked') {
      const cg = findMatchingCangGan(rel.position, shishenWuxing, cangGanNodes)
      if (cg) locked.add(keyOf(rel.position, 'cang'))
      continue
    }

    if (rel.nodeType === 'TianGan' && rel.kind === 'TouGen') {
      const exact = isExactStemMatch(rel.position, shishenWuxing, shishenYinyang, tianGanNodes)
      if (exact) boxed.add(keyOf(rel.position, 'stem'))
      else colored.add(keyOf(rel.position, 'stem'))

      for (const branchPos of rel.roots ?? []) {
        const cgAny = findMatchingCangGan(branchPos, shishenWuxing, cangGanNodes)
        if (!cgAny) continue
        const cgExact = findExactCangGan(branchPos, shishenWuxing, shishenYinyang, cangGanNodes)
        if (cgExact) boxed.add(keyOf(branchPos, 'cang'))
        else colored.add(keyOf(branchPos, 'cang'))
        connections.push({ fromPos: rel.position, fromRow: 'stem', toPos: branchPos, toRow: 'cang' })
      }
      continue
    }

    if (rel.nodeType === 'TianGan' && rel.kind === 'NoTouGen') {
      const exact = isExactStemMatch(rel.position, shishenWuxing, shishenYinyang, tianGanNodes)
      if (exact) boxed.add(keyOf(rel.position, 'stem'))
      else colored.add(keyOf(rel.position, 'stem'))
      continue
    }

    if (rel.nodeType === 'CangGan' && rel.kind === 'TouChu' && rel.through) {
      const cgAny = findMatchingCangGan(rel.position, shishenWuxing, cangGanNodes)
      if (cgAny) {
        const cgExact = findExactCangGan(rel.position, shishenWuxing, shishenYinyang, cangGanNodes)
        if (cgExact) boxed.add(keyOf(rel.position, 'cang'))
        else colored.add(keyOf(rel.position, 'cang'))

        const exact = isExactStemMatch(rel.through, shishenWuxing, shishenYinyang, tianGanNodes)
        if (exact) boxed.add(keyOf(rel.through, 'stem'))
        else colored.add(keyOf(rel.through, 'stem'))

        connections.push({ fromPos: rel.position, fromRow: 'cang', toPos: rel.through, toRow: 'stem' })
      }
      continue
    }

    if (rel.nodeType === 'CangGan' && rel.kind === 'NotTouChu') {
      const cgExact = findExactCangGan(rel.position, shishenWuxing, shishenYinyang, cangGanNodes)
      if (cgExact) boxed.add(keyOf(rel.position, 'cang'))
      else colored.add(keyOf(rel.position, 'cang'))
      continue
    }
  }

  return { nodeState: { boxed, colored, locked }, connections }
}

function getNodeText(
  pos: string,
  row: 'stem' | 'branch' | 'cang',
  calculationResult: any,
  shishenWuxing: string,
  t: any,
): { text: string; color: string } {
  const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
  const cangGanNodes: any[] = calculationResult.pillars?.cangGanNodes ?? []
  const pillarsData = calculationResult.pillars

  if (row === 'stem') {
    const node = tianGanNodes.find((n: any) => n.pos === pos)
    if (!node) return { text: '?', color: ELEMENT_COLORS['gray'] }
    return {
      text: node.stem ? t(`tiangan.${node.stem}`) : '?',
      color: ELEMENT_COLORS[node.wuxing ?? 'gray'],
    }
  }

  if (row === 'branch') {
    const posKey = pos.replace('Branch', '').toLowerCase() as 'year' | 'month' | 'day' | 'hour'
    const branch = pillarsData?.[posKey]?.branch
    const benQi = cangGanNodes.find((cg: any) => cg.branchPos === pos && cg.qi === 'BenQi')
    return {
      text: branch ? t(`dizhi.${branch}`) : '?',
      color: ELEMENT_COLORS[benQi?.wuxing ?? 'gray'],
    }
  }

  const cg = findMatchingCangGan(pos, shishenWuxing, cangGanNodes)
  if (!cg) return { text: '?', color: ELEMENT_COLORS['gray'] }
  return {
    text: cg.stem ? t(`tiangan.${cg.stem}`) : '?',
    color: ELEMENT_COLORS[cg.wuxing ?? 'gray'],
  }
}

// ── 主题二十神节点图 ──────────────────────────────────────────
export function BaziShishenChart({
  calculationResult,
  relations,
  shishenColor,
  shishenWuxing,
  shishenYinyang,
}: {
  calculationResult: any
  relations: ShishenNodeRelation[]
  shishenColor: string
  shishenWuxing: string
  shishenYinyang: string
}) {
  const t = useTranslations('bazi')
  if (!calculationResult || relations.length === 0) return null

  const cangGanNodes: any[] = calculationResult.pillars?.cangGanNodes ?? []
  const tianGanNodes: any[] = calculationResult.pillars?.tianGanNodes ?? []
  const { nodeState, connections } = parseRelations(relations, shishenWuxing, shishenYinyang, cangGanNodes, tianGanNodes)
  const { boxed, colored, locked } = nodeState

  return (
    <svg
      width={280}
      height={210}
      viewBox={`0 0 ${VW} ${VH_NODE}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {[1, 2].map(i => (
        <line key={i}
          x1={0} y1={ROW_H * i} x2={VW} y2={ROW_H * i}
          stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2"
        />
      ))}
      {[1, 2, 3].map(i => (
        <line key={i}
          x1={COL_W * i} y1={0} x2={COL_W * i} y2={VH_NODE}
          stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2"
        />
      ))}

      {connections.map((conn, i) => {
        const path = buildPath(conn.fromPos, conn.fromRow, conn.toPos, conn.toRow)
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

      {STEM_POSITIONS.map((pos) => {
        const center = nodeCenterByPos(pos, 'stem')
        const isBoxed = boxed.has(keyOf(pos, 'stem'))
        const isColored = colored.has(keyOf(pos, 'stem'))
        const isActive = isBoxed || isColored
        const { text, color } = getNodeText(pos, 'stem', calculationResult, shishenWuxing, t)
        return (
          <g key={pos}>
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

      {BRANCH_POSITIONS.map((pos) => {
        const center = nodeCenterByPos(pos, 'branch')
        const { text } = getNodeText(pos, 'branch', calculationResult, shishenWuxing, t)
        return (
          <text key={pos} x={center.x} y={center.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={FONT_SIZE}
            fill="hsl(var(--muted-foreground))"
            opacity={0.1}
          >{text}</text>
        )
      })}

      {BRANCH_POSITIONS.map((pos) => {
        const center = nodeCenterByPos(pos, 'cang')
        const isBoxed = boxed.has(keyOf(pos, 'cang'))
        const isColored = colored.has(keyOf(pos, 'cang'))
        const isLocked = locked.has(keyOf(pos, 'cang'))
        const isVisible = isBoxed || isColored || isLocked
        if (!isVisible) return null
        const { text, color } = getNodeText(pos, 'cang', calculationResult, shishenWuxing, t)
        return (
          <g key={pos}>
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
// 本轮改造：不再读AI返回的中文"关系"字符串猜测位置，改为直接接收结构化的
// GanZhiRelation，位置数据来自代码计算，不存在猜错的可能
export function BaziInteractionChart({
  calculationResult,
  relation,
}: {
  calculationResult: any
  relation: GanZhiRelation
}) {
  const t = useTranslations('bazi')
  if (!calculationResult) return null

  const activePositions = relation.sides.map(s => s.position)
  const activeSet = new Set(activePositions)

  const activeCoords = activePositions
    .map(pos => nodeCenterByPos(pos, rowOf(pos)))

  return (
    <svg
      width={280}
      height={210}
      viewBox={`0 0 ${VW} ${VH_NODE}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <line x1={0} y1={ROW_H} x2={VW} y2={ROW_H}
        stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2" />
      {[1, 2, 3].map(i => (
        <line key={i}
          x1={COL_W * i} y1={0} x2={COL_W * i} y2={ROW_H * 2}
          stroke="hsl(var(--border))" strokeWidth="1" opacity="0.2"
        />
      ))}

      {activeCoords.length >= 2 && (
        <line
          x1={activeCoords[0].x} y1={activeCoords[0].y}
          x2={activeCoords[1].x} y2={activeCoords[1].y}
          stroke="hsl(var(--foreground))"
          strokeWidth="3" opacity="0.6" strokeLinecap="round"
        />
      )}

      {STEM_POSITIONS.map((pos) => {
        const center = nodeCenterByPos(pos, 'stem')
        const isActive = activeSet.has(pos)
        const { text, color } = getNodeText(pos, 'stem', calculationResult, '', t)
        return (
          <g key={pos}>
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

      {BRANCH_POSITIONS.map((pos) => {
        const center = nodeCenterByPos(pos, 'branch')
        const isActive = activeSet.has(pos)
        const { text, color } = getNodeText(pos, 'branch', calculationResult, '', t)
        return (
          <g key={pos}>
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