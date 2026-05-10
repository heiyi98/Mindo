/**
 * 临时调试脚本：用真实测试档案生成 BaziSnapshot，
 * 并打印 formatBaziDataSheet 的完整输出（即实际传给 Gemini 的内容）。
 * 运行：pnpm tsx scripts/print-bazi-datasheet.ts
 */

import { engine, analyzeBazi, toBaziSnapshot } from '../packages/core/src/index';
import type { TianGan, DiZhi, Wuxing, BaziSnapshot } from '../packages/core/src/index';

// ──────────────────────────────────────────────────────────
// 测试档案（模拟数据库里的 profile 行）
// ──────────────────────────────────────────────────────────
const profile = {
  display_name: '测试用户-壬水日主',
  birth_date:   '1990-08-15',
  birth_time:   '14:30',
  birth_place_name: '北京市',
  birth_lat:    39.9042,
  birth_lng:    116.4074,
};

// ──────────────────────────────────────────────────────────
// 第一步：排盘计算
// ──────────────────────────────────────────────────────────
const dateStr = `${profile.birth_date}T${profile.birth_time}:00`;
const baziResult = engine.calculate({
  dateStr,
  lat: profile.birth_lat,
  lng: profile.birth_lng,
  timeUnknown: false,
});

console.log('\n=== 原始排盘结果 ===');
console.log('年柱:', baziResult.pillars.year.stem, baziResult.pillars.year.branch);
console.log('月柱:', baziResult.pillars.month.stem, baziResult.pillars.month.branch);
console.log('日柱:', baziResult.pillars.day.stem, baziResult.pillars.day.branch);
console.log('时柱:', baziResult.pillars.hour.stem, baziResult.pillars.hour.branch);
console.log('节气:', baziResult.meta?.jie_qi);

// ──────────────────────────────────────────────────────────
// 第二步：七步分析
// ──────────────────────────────────────────────────────────
const analysis = analyzeBazi({
  year:  { stem: baziResult.pillars.year.stem as TianGan,  branch: baziResult.pillars.year.branch as DiZhi  },
  month: { stem: baziResult.pillars.month.stem as TianGan, branch: baziResult.pillars.month.branch as DiZhi },
  day:   { stem: baziResult.pillars.day.stem as TianGan,   branch: baziResult.pillars.day.branch as DiZhi   },
  hour:  {
    stem:   (baziResult.pillars.hour.stem || 'Jia') as TianGan,
    branch: (baziResult.pillars.hour.branch || 'Zi') as DiZhi,
  },
});

// ──────────────────────────────────────────────────────────
// 第三步：构建 BaziSnapshot
// ──────────────────────────────────────────────────────────
const meta = {
  solarTime: baziResult.meta?.solar_time || '',
  lunarTime: baziResult.meta?.lunar_time || '',
  jieQi:     baziResult.meta?.jie_qi || '',
};

const energyScores: Record<Wuxing, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
for (const node of analysis.energyNodes) {
  if (node.outputEnabled) energyScores[node.wuxing] += node.energy;
}

const snap: BaziSnapshot = toBaziSnapshot(analysis, meta, energyScores);

console.log('\n=== BaziSnapshot 七段结构（JSON）===');
console.log(JSON.stringify(snap, null, 2));

// ──────────────────────────────────────────────────────────
// 第四步：formatBaziDataSheet（复制自 /api/ai/reading/route.ts）
// ──────────────────────────────────────────────────────────
function formatBaziDataSheet(snap: BaziSnapshot, profile: { birth_date: string; birth_time: string | null; birth_place_name: string | null }): string {
  const lines: string[] = [];
  const p = snap.pillars;
  const qiLabels: Record<string, string> = {
    BenQi: '本气', ZhongQi: '中气', YuQi: '余气'
  };
  const posLabels: Record<string, string> = {
    YearStem: '年干', MonthStem: '月干', DayStem: '日干', HourStem: '时干',
    YearBranch: '年支', MonthBranch: '月支', DayBranch: '日支', HourBranch: '时支'
  };
  const heLabels: Record<string, string> = {
    ZhenHua: '真化', HeBan: '合绊', ZhengHe: '争合', DuHe: '妒合'
  };
  const relLabels: Record<string, string> = {
    SanHui: '三会', SanHe: '三合', BanHe: '半合', GongHe: '拱合',
    LiuHe: '六合', LiuChong: '六冲', Xing: '刑', Hai: '害', Po: '破'
  };
  const ssLabels: Record<string, string> = {
    BiJian: '比肩', JieCai: '劫财', ShiShen: '食神', ShangGuan: '伤官',
    PianCai: '偏财', ZhengCai: '正财', QiSha: '七杀', ZhengGuan: '正官',
    PianYin: '偏印', ZhengYin: '正印', DayMaster: '日主'
  };

  lines.push('============================');
  lines.push('BAZI ANALYSIS DATA SHEET');
  lines.push('============================');
  lines.push('');

  lines.push('【一、基础命盘】');
  lines.push(`出生日期：${profile.birth_date}`);
  lines.push(`出生时间：${profile.birth_time || '未知'}`);
  lines.push(`出生地点：${profile.birth_place_name || '未知'}`);
  lines.push(`年柱：${p.year.stem} ${p.year.branch}`);
  lines.push(`月柱：${p.month.stem} ${p.month.branch}`);
  lines.push(`日柱：${p.day.stem} ${p.day.branch}（日主）`);
  lines.push(`时柱：${p.hour.stem} ${p.hour.branch}`);
  lines.push(`月令：${p.yuelingWuxing}`);
  lines.push('');

  lines.push('【二、藏干明细】');
  const branchGroups = new Map<string, any[]>();
  for (const cg of p.cangGanNodes) {
    if (!branchGroups.has(cg.branchPos)) branchGroups.set(cg.branchPos, []);
    branchGroups.get(cg.branchPos)!.push(cg);
  }
  for (const [pos, cgs] of branchGroups) {
    lines.push(`${posLabels[pos] || pos}（${cgs[0].branch}）：`);
    for (const cg of cgs) {
      lines.push(`  ${cg.stem}（${cg.wuxing}）${qiLabels[cg.qi] || cg.qi} 基础分${cg.baseScore}`);
    }
  }
  lines.push('');

  lines.push('【三、天干关系】');
  const r = snap.relations;
  if (!r.tianGanHe?.length) {
    lines.push('五合：无');
  } else {
    lines.push('五合：');
    for (const he of r.tianGanHe) {
      lines.push(`  ${he.stem1}(${posLabels[he.stem1Pos]}) × ${he.stem2}(${posLabels[he.stem2Pos]}) → 化${he.huashen} [${heLabels[he.result] || he.result}]`);
    }
  }
  if (!r.tianGanChong?.length) {
    lines.push('相冲：无');
  } else {
    lines.push('相冲：');
    for (const chong of r.tianGanChong) {
      lines.push(`  ${chong.stem1}(${posLabels[chong.stem1Pos]}) 冲 ${chong.stem2}(${posLabels[chong.stem2Pos]})`);
    }
  }
  lines.push('');

  lines.push('【四、地支关系标注】');
  if (!r.diZhiRelations?.length) {
    lines.push('无');
  } else {
    for (const rel of r.diZhiRelations) {
      const typeLabel = relLabels[rel.type] || rel.type;
      lines.push(`  ${typeLabel}：${rel.branches.join(' ')}（${rel.positions.join(' ')}）${rel.note ? ' — ' + rel.note : ''}`);
    }
  }
  lines.push('');

  lines.push('【五、透根与隐显】');
  const tg = snap.tougen;
  for (const t of tg.touGenResults) {
    if (!t.roots?.length) {
      lines.push(`  ${posLabels[t.stemPos]}${t.stem}（${t.wuxing}）：无根【露】`);
    } else {
      const rootStrs = t.roots.map((rt: any) =>
        `根在${posLabels[rt.branchPos]}${rt.cangganStem}${qiLabels[rt.qi] || rt.qi}（系数${rt.tougenCoeff.toFixed(2)}）`
      ).join('、');
      lines.push(`  ${posLabels[t.stemPos]}${t.stem}（${t.wuxing}）：${rootStrs}，总系数${t.totalTougenCoeff.toFixed(2)}【透出】`);
    }
  }
  lines.push('藏干隐显：');
  for (const cv of tg.cangGanVisibility) {
    const lockStr = cv.isMuKuLocked ? '【墓库待用】' : '';
    lines.push(`  ${cv.cangganId}：【${cv.tag === 'TouChu' ? '透出' : '藏'}】${lockStr}`);
  }
  lines.push('');

  lines.push('【六、独立能量】');
  for (const node of snap.energy.energyNodes) {
    const typeLabel = node.type === 'TianGan' ? '天干' : '藏干';
    const statusStr = node.outputEnabled
      ? ''
      : `【${node.disableReason === 'HeBan' ? '合绊-对外无效' : '墓库待用-对外无效'}】`;
    lines.push(`  ${typeLabel} ${node.stem}(${node.wuxing}) @ ${posLabels[node.pos] || node.pos}：能量${node.energy.toFixed(2)}${statusStr}`);
  }
  lines.push('');

  lines.push('【七、十神挂载】');
  for (const ss of snap.shishen.shishenMap) {
    lines.push(`  ${ss.id}：${ssLabels[ss.shishen] || ss.shishen}`);
  }
  lines.push('');

  lines.push('【八、宫位距离权重】');
  lines.push('  年干0.50 | 年支0.45 | 月干1.00 | 月支0.71');
  lines.push('  日支1.00 | 时干1.00 | 时支0.71');
  lines.push('');

  lines.push('【九、十神影响力总值】');
  const sorted = [...snap.influence.shishenInfluence]
    .sort((a: any, b: any) => b.totalInfluence - a.totalInfluence);
  for (const group of sorted) {
    lines.push(`  ${ssLabels[group.shishen] || group.shishen}：总影响力 ${group.totalInfluence.toFixed(2)}`);
  }
  lines.push(`  日主自身能量：${snap.influence.dayMasterEnergy.toFixed(2)}`);
  lines.push('');
  lines.push('============================');
  lines.push('END OF DATA SHEET');
  lines.push('============================');

  return lines.join('\n');
}

console.log('\n\n=== formatBaziDataSheet 输出（实际传给 Gemini 的内容）===\n');
const dataSheet = formatBaziDataSheet(snap, profile);
console.log(dataSheet);
