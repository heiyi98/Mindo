/**
 * 算法手工验证脚本（无断言，人工核对）
 * 运行: pnpm exec tsx src/bazi/constitution/__tests__/algorithm.test.ts
 */
import { buildManualBaziSnapshot } from '../manualInput';
import { computeConstitution } from '../index';
import type { ConstitutionResult } from '../types';

function printResult(label: string, result: ConstitutionResult) {
  console.log('\n' + '═'.repeat(60));
  console.log(`${label}（版本：${result.version}）`);
  console.log('─'.repeat(60));

  console.log('▶ 层一 阴阳层');
  console.log(
    `  总局：阳${result.layerOne.overall.yangSum.toFixed(1)}(${result.layerOne.overall.yangLabel}) / ` +
    `阴${result.layerOne.overall.yinSum.toFixed(1)}(${result.layerOne.overall.yinLabel})`
  );
  console.log(
    `  天干：阳${result.layerOne.tianGan.yangSum.toFixed(1)}(${result.layerOne.tianGan.yangLabel}) / ` +
    `阴${result.layerOne.tianGan.yinSum.toFixed(1)}(${result.layerOne.tianGan.yinLabel})`
  );
  console.log(
    `  藏干：阳${result.layerOne.cangGan.yangSum.toFixed(1)}(${result.layerOne.cangGan.yangLabel}) / ` +
    `阴${result.layerOne.cangGan.yinSum.toFixed(1)}(${result.layerOne.cangGan.yinLabel})`
  );
  console.log(`  五态人：${result.layerOne.fiveConstitution}`);

  console.log('▶ 层二.一 五行静态值');
  for (const r of result.layerTwo.fiveResults) {
    console.log(`  ${r.wuxing}: ${r.value.toFixed(1)} (${r.label})`);
  }

  console.log('▶ 层二.二/二.三 十干静态值+脏腑');
  for (const r of result.layerTwo.tenResults) {
    console.log(`  ${r.yinyang}_${r.wuxing}: ${r.value.toFixed(1)} (${r.label}) → ${r.organ}`);
  }

  console.log('▶ 层三 动态五行层（调整后）');
  for (const w of ['Wood', 'Fire', 'Earth', 'Metal', 'Water'] as const) {
    console.log(`  ${w}: ${result.layerThree[w].toFixed(1)}`);
  }

  console.log('▶ 层四 处方层');
  for (const p of result.layerFour) {
    const adviceLabel = p.advice === 'supplement' ? '宜补' : p.advice === 'reduce' ? '宜泻' : '持平';
    console.log(
      `  ${p.wuxing}: ${adviceLabel} (stdBefore=${p.stdBefore.toFixed(2)}, stdAfter=${p.stdAfter.toFixed(2)})`
    );
  }
}

// 测试用例：任取一个真实出生时间，构造手动输入命盘
const snapshot = buildManualBaziSnapshot({
  year: 1990,
  month: 5,
  day: 15,
  hour: 10,
  minute: 30,
});

console.log(
  `四柱  年:${snapshot.pillars.year.stem}/${snapshot.pillars.year.branch}  ` +
  `月:${snapshot.pillars.month.stem}/${snapshot.pillars.month.branch}  ` +
  `日:${snapshot.pillars.day.stem}/${snapshot.pillars.day.branch}  ` +
  `时:${snapshot.pillars.hour?.stem}/${snapshot.pillars.hour?.branch}`
);

const regular = computeConstitution(snapshot, 'regular');
const ziping = computeConstitution(snapshot, 'ziping');

printResult('常规版', regular);
printResult('子平版', ziping);

// 人工核对要点：
// 1. 层一/层二各分组内部：阳总+阴总（或十个值加总）应约等于该层的能量来源总和
// 2. 常规版层二.一 五行合计应等于 regularEnergy 节点能量总和；子平版应约等于
//    snapshot.energyScores（后者按outputEnabled过滤，前者不做任何过滤——若命盘本身
//    没有合绊/墓库锁闭/三会，两版数值应完全一致；若有，两版才会分道扬镳）
// 3. 层四每一行的建议应和"层三里这一行相对其余四行是偏低还是偏高"大致对应
//    （偏低的行注入后通常拉近整体离散度→宜补；偏高的行同理→更可能宜泻）
