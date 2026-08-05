// ═══════════════════════════════════════════════════════════════════════════
// 报告页专用转译层——把 @mindo/core 算出的命盘事实，转成结构化数据供
// BaziReadingView.tsx / BaziReadingChart.tsx / usePdfExport.tsx 使用。
// 本文件是这三者的下游消费者，反向对接 @mindo/core 现成的
// analyzeBazi()/toBaziSnapshot() 产出，不在 packages/core 里创建任何
// 专门服务本文件的接口。
// ═══════════════════════════════════════════════════════════════════════════
import type {
  BaziSnapshot, GongWeiPos, ShiShen, Wuxing, YinYang,
  TianGanHeResult, DiZhiRelationType,
} from '@mindo/core';

// ─────────────────────────────────────────────────────────────────────────
// 第一部分：十神关系（原 packages/core/src/bazi/shishenRelations.ts 原样搬迁，
// 逻辑未改动，仅调整为从 '@mindo/core' 导入类型）
// ─────────────────────────────────────────────────────────────────────────

const ALL_TEN_SHISHEN: Exclude<ShiShen, 'DayMaster'>[] = [
  'BiJian', 'JieCai', 'ShiShen', 'ShangGuan',
  'PianCai', 'ZhengCai', 'QiSha', 'ZhengGuan',
  'PianYin', 'ZhengYin',
];

export interface ShishenNodeRelation {
  position: GongWeiPos;
  nodeType: 'TianGan' | 'CangGan';
  kind: 'TouGen' | 'NoTouGen' | 'MuKuLocked' | 'TouChu' | 'NotTouChu';
  /** 仅 kind === 'TouGen' 时存在：通根到的地支位置列表 */
  roots?: GongWeiPos[];
  /** 仅 kind === 'TouChu' 时存在：透出到的天干位置 */
  through?: GongWeiPos;
}

/** 键为十神英文代号（BiJian/JieCai/...），值为空数组表示"无节点" */
export type ShishenRelations = Record<string, ShishenNodeRelation[]>;

export function buildShishenRelations(snapshot: BaziSnapshot): ShishenRelations {
  const shishenById = new Map(snapshot.shishen.shishenMap.map(n => [n.id, n.shishen]));
  const visibilityById = new Map(snapshot.tougen.cangGanVisibility.map(v => [v.cangganId, v]));
  const tougenByStemPos = new Map(snapshot.tougen.touGenResults.map(r => [r.stemPos, r]));

  const nodesByShishen = new Map<ShiShen, typeof snapshot.energy.energyNodes>();
  for (const node of snapshot.energy.energyNodes) {
    const ss = shishenById.get(node.id);
    if (!ss || ss === 'DayMaster') continue;
    if (!nodesByShishen.has(ss)) nodesByShishen.set(ss, []);
    nodesByShishen.get(ss)!.push(node);
  }

  const result: ShishenRelations = {};

  for (const ssKey of ALL_TEN_SHISHEN) {
    const nodes = nodesByShishen.get(ssKey) ?? [];

    if (nodes.length === 0) {
      result[ssKey] = [];
      continue;
    }

    const entries: ShishenNodeRelation[] = [];
    for (const node of nodes) {
      if (node.type === 'TianGan') {
        const tougen = tougenByStemPos.get(node.pos);
        const roots = tougen?.roots.map(r => r.branchPos) ?? [];
        if (roots.length > 0) {
          entries.push({ position: node.pos, nodeType: 'TianGan', kind: 'TouGen', roots });
        } else {
          entries.push({ position: node.pos, nodeType: 'TianGan', kind: 'NoTouGen' });
        }
      } else {
        if (node.disableReason === 'MuKuLocked') {
          entries.push({ position: node.pos, nodeType: 'CangGan', kind: 'MuKuLocked' });
        } else if (visibilityById.get(node.id)?.tag === 'TouChu') {
          const tianGanNode = snapshot.pillars.tianGanNodes.find(tg => tg.wuxing === node.wuxing);
          entries.push({
            position: node.pos,
            nodeType: 'CangGan',
            kind: 'TouChu',
            through: tianGanNode?.pos,
          });
        } else {
          entries.push({ position: node.pos, nodeType: 'CangGan', kind: 'NotTouChu' });
        }
      }
    }
    result[ssKey] = entries;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// 第二部分：干支关系（新增——对应报告"机制交互"小节，与AI返回的机制交互
// 数组按顺序一一配对使用，不解析AI返回的中文"关系"字段）
// ─────────────────────────────────────────────────────────────────────────

export interface RelationSide {
  position: GongWeiPos;
  shishen: ShiShen | null;
  wuxing: Wuxing;
  yinyang: YinYang;
}

export type GanZhiRelation =
  | { category: 'TianGanHe'; kind: TianGanHeResult; sides: [RelationSide, RelationSide]; huashen?: Wuxing }
  | { category: 'TianGanChong'; sides: [RelationSide, RelationSide] }
  | { category: 'DiZhiRelation'; kind: DiZhiRelationType; sides: RelationSide[]; huifangWuxing?: Wuxing };

export function buildGanZhiRelations(snapshot: BaziSnapshot): GanZhiRelation[] {
  const shishenById = new Map(snapshot.shishen.shishenMap.map(n => [n.id, n.shishen]));
  const tianGanNodes = snapshot.pillars.tianGanNodes;
  const cangGanNodes = snapshot.pillars.cangGanNodes;

  // 天干侧：直接读天干节点自身的阴阳五行（若发生真化，节点已被结构层改写）
  function tianGanSide(pos: GongWeiPos, stem: string): RelationSide {
    const node = tianGanNodes.find(n => n.pos === pos);
    const id = `${pos}_${stem}`;
    return {
      position: pos,
      shishen: shishenById.get(id) ?? null,
      wuxing: node?.wuxing as Wuxing,
      yinyang: node?.yinyang as YinYang,
    };
  }

  // 地支侧：取该地支藏干中 baseScore 最高的"本气"节点代表这一柱
  function diZhiSide(pos: GongWeiPos): RelationSide | null {
    const cgsAtPos = cangGanNodes.filter(cg => cg.branchPos === pos);
    if (cgsAtPos.length === 0) return null;
    const benQi = cgsAtPos.reduce((best, cg) => (cg.baseScore > best.baseScore ? cg : best));
    return {
      position: pos,
      shishen: shishenById.get(benQi.id) ?? null,
      wuxing: benQi.wuxing,
      yinyang: benQi.yinyang,
    };
  }

  const relations: GanZhiRelation[] = [];

  for (const he of snapshot.relations.tianGanHe) {
    relations.push({
      category: 'TianGanHe',
      kind: he.result,
      sides: [tianGanSide(he.stem1Pos, he.stem1), tianGanSide(he.stem2Pos, he.stem2)],
      huashen: he.result === 'ZhenHua' ? he.huashen : undefined,
    });
  }

  for (const chong of snapshot.relations.tianGanChong) {
    relations.push({
      category: 'TianGanChong',
      sides: [tianGanSide(chong.stem1Pos, chong.stem1), tianGanSide(chong.stem2Pos, chong.stem2)],
    });
  }

  for (const rel of snapshot.relations.diZhiRelations) {
    const sides = rel.positions
      .map(pos => diZhiSide(pos))
      .filter((s): s is RelationSide => s !== null);
    relations.push({
      category: 'DiZhiRelation',
      kind: rel.type,
      sides,
      huifangWuxing: (rel.type === 'SanHui' || rel.type === 'SanHe') ? rel.wuxing : undefined,
    });
  }

  return relations;
}
