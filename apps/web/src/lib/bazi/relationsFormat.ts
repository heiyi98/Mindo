import type { ShishenNodeRelation, GanZhiRelation } from './reportRelations'

// 十神中文名 → 英文代号（AI报告返回的是中文，需要靠这张表认出对应哪个十神）
export const SHISHEN_ZH_TO_KEY: Record<string, string> = {
  '比肩': 'BiJian', '劫财': 'JieCai', '食神': 'ShiShen', '伤官': 'ShangGuan',
  '偏财': 'PianCai', '正财': 'ZhengCai', '七杀': 'QiSha', '正官': 'ZhengGuan',
  '偏印': 'PianYin', '正印': 'ZhengYin',
}

// 场景词中文名 → 词典键（Theme3现实反应 / Theme4针对性优化 共用同一套七类场景）
export const SCENE_ZH_TO_KEY: Record<string, string> = {
  '交友': 'friends', '工作': 'work', '事业': 'career',
  '约束': 'constraint', '积累': 'accumulation', '爱情': 'love', '理想': 'ideal',
}

// 把"年/月/日/时 + 干/支"拼成一句可读文字，网页和PDF共用
export function formatPosition(t: any, pos: string): string {
  const isStem = pos.endsWith('Stem')
  const unit = pos.replace(/Stem|Branch/, '').toLowerCase() as 'year' | 'month' | 'day' | 'hour'
  const unitLabel = t(unit)
  const kindLabel = isStem ? t('metadata.stem') : t('metadata.branch')
  return `${unitLabel} · ${kindLabel}`
}

// 把一条结构化关系数据拼成一句人话（"日支：墓库锁闭"这类），网页和PDF共用
export function formatRelationLine(t: any, rel: ShishenNodeRelation): string {
  const posLabel = formatPosition(t, rel.position)
  switch (rel.kind) {
    case 'TouGen': {
      const roots = (rel.roots ?? []).map(r => formatPosition(t, r)).join(' ')
      return `${posLabel}：${t('metadata.touGen')} → ${roots}`
    }
    case 'NoTouGen':
      return `${posLabel}：${t('metadata.noTouGen')}`
    case 'MuKuLocked':
      return `${posLabel}：${t('metadata.muKuLocked')}`
    case 'TouChu': {
      const through = rel.through ? formatPosition(t, rel.through) : '?'
      return `${posLabel}：${t('metadata.touChu')} → ${through}`
    }
    case 'NotTouChu':
      return `${posLabel}：${t('metadata.notTouChu')}`
    default:
      return posLabel
  }
}

// 把一侧（天干或藏干）拼成"位置(十神,阴阳五行)"这种简短标注
function formatSide(t: any, side: GanZhiRelation['sides'][number]): string {
  const posLabel = formatPosition(t, side.position)
  const ssLabel = side.shishen ? t(`shishen.${side.shishen}`) : ''
  const yyLabel = t(`yinyang.${side.yinyang}`)
  const wxLabel = t(`wuxing.${side.wuxing}`)
  return `${posLabel}（${ssLabel ? ssLabel + ' · ' : ''}${yyLabel}${wxLabel}）`
}

// 把一条结构化干支关系拼成一句人话（"机制交互"小节的关系摘要行），网页和PDF共用
export function formatGanZhiRelation(t: any, relation: GanZhiRelation): string {
  const sidesText = relation.sides.map(s => formatSide(t, s)).join(' × ')

  if (relation.category === 'TianGanHe') {
    const kindLabel = t(`relationKind.${relation.kind}`)
    if (relation.kind === 'ZhenHua' && relation.huashen) {
      return `${sidesText} ${kindLabel} → ${t(`wuxing.${relation.huashen}`)}`
    }
    return `${sidesText} ${kindLabel}`
  }

  if (relation.category === 'TianGanChong') {
    return `${sidesText} ${t('relationKind.TianGanChong')}`
  }

  // DiZhiRelation
  const kindLabel = t(`relationKind.${relation.kind}`)
  const huifangSuffix = relation.huifangWuxing
    ? ` ${t('metadata.huifang')}${t(`wuxing.${relation.huifangWuxing}`)}`
    : ''
  return `${sidesText} ${kindLabel}${huifangSuffix}`
}