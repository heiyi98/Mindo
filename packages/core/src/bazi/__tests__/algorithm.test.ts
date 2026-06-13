/**
 * 算法手工验证脚本（无断言，人工核对）
 * 运行: pnpm exec tsx src/bazi/__tests__/algorithm.test.ts
 */
import { analyzeBazi } from '../analysis';

// ──────────────────────────────────────────────────────────────
// 工具：格式化输出
// ──────────────────────────────────────────────────────────────
function printCase(label: string, result: ReturnType<typeof analyzeBazi>) {
  const { pattern, yongshen, shishenMap, energyNodes, tianGanNodes, diZhiRelations } = result;

  console.log('\n' + '═'.repeat(56));
  console.log(`测试用例：${label}`);
  console.log('─'.repeat(56));

  // 四柱
  const p = result.pillars;
  const hour = p.hour ? `${p.hour.stem}/${p.hour.branch}` : '(无时)';
  console.log(`四柱  年:${p.year.stem}/${p.year.branch}  月:${p.month.stem}/${p.month.branch}  日:${p.day.stem}/${p.day.branch}  时:${hour}`);

  // 月令
  console.log(`月令五行: ${result.yuelingWuxing}`);

  // 地支关系
  const notable = diZhiRelations.filter(r =>
    r.type === 'SanHui' || r.type === 'SanHe' || r.type === 'LiuChong'
  );
  if (notable.length > 0) {
    console.log(`地支关系: ${notable.map(r => `${r.type}[${r.branches.join(',')}]${r.wuxing ? '='+r.wuxing : ''}`).join('  ')}`);
  }

  // 天干五合结果
  if (result.tianGanHeResults.length > 0) {
    console.log(`天干五合: ${result.tianGanHeResults.map(r => `${r.stem1}+${r.stem2}→${r.huashen}(${r.result})`).join('  ')}`);
  }

  // 十神总览（天干层面）
  const dmSs = shishenMap.map(s => {
    const node = energyNodes.find(n => n.id === s.id && n.type === 'TianGan');
    if (!node) return null;
    return `${node.stem}(${s.shishen})`;
  }).filter(Boolean).join('  ');
  console.log(`天干十神: ${dmSs}`);

  // 格局
  if (pattern) {
    console.log(`\n▶ 格局: [${pattern.category}] ${pattern.name}`);
  } else {
    console.log('\n▶ 格局: undefined');
  }

  // 用神
  if (yongshen) {
    console.log(`▶ 用神: ${yongshen.wuxing} / ${yongshen.yinyang} / ${yongshen.shishen}`);
  } else {
    console.log('▶ 用神: undefined');
  }

  // 能量分布（五行合计，仅 outputEnabled）
  const wxSum: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const n of energyNodes) {
    if (n.outputEnabled) wxSum[n.wuxing] += n.energy;
  }
  const total = Object.values(wxSum).reduce((a, b) => a + b, 0);
  const bar = (v: number) => Math.round((v / total) * 20);
  console.log('\n  能量分布（outputEnabled）:');
  for (const [wx, val] of Object.entries(wxSum)) {
    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
    console.log(`  ${wx.padEnd(6)}: ${'█'.repeat(bar(val)).padEnd(20)} ${val.toFixed(1).padStart(7)} (${pct}%)`);
  }
}

// ══════════════════════════════════════════════════════════════
// 用例一：壬申日 乙卯月 戊寅年 庚戌时
//   预期格局: 伤官格（乙透月干，卯月本气乙=伤官）
//   预期用神: Metal（印星）
// ══════════════════════════════════════════════════════════════
const case1 = analyzeBazi({
  year:  { stem: 'Wu',   branch: 'Yin'  }, // 戊寅
  month: { stem: 'Yi',   branch: 'Mao'  }, // 乙卯
  day:   { stem: 'Ren',  branch: 'Shen' }, // 壬申
  hour:  { stem: 'Geng', branch: 'Xu'   }, // 庚戌
});
printCase('壬申日 乙卯月 戊寅年 庚戌时', case1);

// ══════════════════════════════════════════════════════════════
// 用例二：甲子四柱（纯水木）
//   预期格局: 视地支而定，记录实际输出
// ══════════════════════════════════════════════════════════════
const case2 = analyzeBazi({
  year:  { stem: 'Jia', branch: 'Zi' }, // 甲子
  month: { stem: 'Jia', branch: 'Zi' }, // 甲子
  day:   { stem: 'Jia', branch: 'Zi' }, // 甲子
  hour:  { stem: 'Jia', branch: 'Zi' }, // 甲子
});
printCase('甲子×4（纯水木格）', case2);

// ══════════════════════════════════════════════════════════════
// 用例三：申子辰三合水局 + 甲木日干
//   天干无水（印）无木（比），地支三合水局
//   预期格局: 从杀格（水克木=官杀）
//   注：算法含藏干层面的印/比检测，实际输出可能不同
// ══════════════════════════════════════════════════════════════
const case3 = analyzeBazi({
  year:  { stem: 'Geng', branch: 'Shen' }, // 庚申
  month: { stem: 'Wu',   branch: 'Zi'   }, // 戊子
  day:   { stem: 'Jia',  branch: 'Chen' }, // 甲辰
  hour:  { stem: 'Bing', branch: 'Shen' }, // 丙申
});
printCase('庚申/戊子/甲辰/丙申（申子辰水局+甲木）', case3);

// 用例三补充：检查 noCongForbidden 相关的 shishenMap 内容
console.log('\n  [用例三诊断] shishenMap 中含印/比 的节点:');
const forbidden3 = case3.shishenMap.filter(s =>
  ['PianYin', 'ZhengYin', 'BiJian', 'JieCai'].includes(s.shishen)
);
for (const s of forbidden3) {
  const node = case3.energyNodes.find(n => n.id === s.id);
  if (node) {
    console.log(`    ${s.id}  ${node.type}  ${node.stem}(${node.wuxing})  ${s.shishen}  outputEnabled:${node.outputEnabled}`);
  }
}

console.log('\n' + '═'.repeat(56));
