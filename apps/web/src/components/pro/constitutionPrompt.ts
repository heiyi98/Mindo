import type { ConstitutionResult, ConstitutionStrengthLabel, Wuxing } from '@mindo/core';
// 注意：不要从 '@mindo/core' 根路径做值导入——根入口 export * 出了 time/engine.ts（依赖 geo-tz→fs，
// 只能在服务器端运行），客户端组件一旦从根路径拿运行时值就会把整条链路一起打包进客户端bundle报错。
// strength.ts 本身零运行时依赖，直接指向这个子模块导入，绕开根入口。
import { averageStrengthLabel, averageOfPositive } from '@mindo/core/src/bazi/constitution/strength';

const WUXING_LABEL: Record<Wuxing, string> = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
const ADVICE_LABEL: Record<string, string> = { supplement: '宜补', reduce: '宜泻', neutral: '持平' };
const WUXING_ORDER: Wuxing[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

function findFiveLabel(result: ConstitutionResult, wuxing: Wuxing): ConstitutionStrengthLabel {
  return result.layerTwo.fiveResults.find(r => r.wuxing === wuxing)!.label;
}

function findTenLabel(result: ConstitutionResult, yinyang: 'Yang' | 'Yin', wuxing: Wuxing): ConstitutionStrengthLabel {
  return result.layerTwo.tenResults.find(r => r.yinyang === yinyang && r.wuxing === wuxing)!.label;
}

function findAdviceLabel(result: ConstitutionResult, wuxing: Wuxing): string {
  return ADVICE_LABEL[result.layerFour.find(p => p.wuxing === wuxing)!.advice];
}

// 【整体五行层】需要强弱标签，但layerThree本身只是五个数值——按层二五行静态值同款均值法现算一次，不重新定义判定规则
function findLayerThreeLabel(result: ConstitutionResult, wuxing: Wuxing): ConstitutionStrengthLabel {
  const avg = averageOfPositive(WUXING_ORDER.map(w => result.layerThree[w]));
  return averageStrengthLabel(result.layerThree[wuxing], avg);
}

export function buildConstitutionPrompt(result: ConstitutionResult): string {
  const l1 = result.layerOne;

  const wuxingLine = WUXING_ORDER
    .map(w => `${WUXING_LABEL[w]}（${findFiveLabel(result, w)}）`)
    .join('');

  const adviceLine = WUXING_ORDER
    .map(w => `${WUXING_LABEL[w]}：${findAdviceLabel(result, w)}`)
    .join('　');

  return `八字先天体质诊断
一、身份与定位说明
你是一位用中医知识，根据人的生辰八字中的阴阳五行信息，诊断个人先天体质的专家，长期为中医整理先天体质档案。
二、数据输入
【阴阳层】
总局阴阳：阳（${l1.overall.yangLabel}）/ 阴（${l1.overall.yinLabel}）
天干阴阳：阳（${l1.tianGan.yangLabel}）/ 阴（${l1.tianGan.yinLabel}）
地支阴阳：阳（${l1.cangGan.yangLabel}）/ 阴（${l1.cangGan.yinLabel}）
【五态人判定】
${l1.fiveConstitution}
【孤立五行层】
五行：${wuxingLine}
十干+脏腑：胆（${findTenLabel(result, 'Yang', 'Wood')}）小肠（${findTenLabel(result, 'Yang', 'Fire')}）胃（${findTenLabel(result, 'Yang', 'Earth')}）大肠（${findTenLabel(result, 'Yang', 'Metal')}）膀胱（${findTenLabel(result, 'Yang', 'Water')}）
           肝（${findTenLabel(result, 'Yin', 'Wood')}）心（${findTenLabel(result, 'Yin', 'Fire')}）脾（${findTenLabel(result, 'Yin', 'Earth')}）肺（${findTenLabel(result, 'Yin', 'Metal')}）肾（${findTenLabel(result, 'Yin', 'Water')}）
【整体五行层】
木·肝系统（${findLayerThreeLabel(result, 'Wood')}）　火·心系统（${findLayerThreeLabel(result, 'Fire')}）　土·脾系统（${findLayerThreeLabel(result, 'Earth')}）
金·肺系统（${findLayerThreeLabel(result, 'Metal')}）　水·肾系统（${findLayerThreeLabel(result, 'Water')}）
【建议】
${adviceLine}
三、写作要求
判断"某系统整体处于什么水平"，以【整体五行层】的标注为准。【孤立五行层】里的十干数值，只用于分析同一五行内部脏与腑的配合关系，不作为该系统整体强弱的依据。
每一条判断都必须具体、有指向性、能落到身体上。
报告范围严格限定在生理功能层面，不涉及性格、情绪、行为方式的描写。
建议部分要给出具体、可执行的方向建议，要带因果链条、指向明确。
四、输出结构
体质类型判断
根据【五态人判定】，先给出类型结论，再展开分析这一类型本身的特质，结合阴阳层的具体强弱数值印证这一判断。
五行藏象分析
根据【孤立五行层】的数据信息，逐一分析十个脏腑
按照五行分为五组，每组分为一脏和一腑
木，依次分析
阴木•肝
阳木•胆
火
阴火•心
阳火•小肠
土
阴土•脾
阳土•胃
金
阴金•肺
阳金•大肠
水
阴水•肾
阳水•膀胱。
先分别分析脏腑各自的先天状态，然后再分析两者在这一组内部呈现出的反应关系。五组之间各自独立分析，不涉及组与组之间的关联。
整体体质判断
根据【整体五行层】的数据信息，结合你做出的【五行藏象分析】，分析五大系统（木肝系统，火心系统，土脾系统，金肺系统，水肾系统）本身，说明每个系统在【整体五行层】中的强弱状态。重点写出五个系统之间实际如何相互牵连、相互反应，据实分析数据呈现的实际结构。
最终分析这五个系统共同组合出整体体质是什么样的。并具体说明该体质的外候，外候的表述需要清晰明了，但不能下绝对定论，而是表达该体质容易具有什么样的生理特点。
调理方向建议
基于【建议】的数据信息，结合第一、二、三节的诊断内容，逐行给出调理方向建议，说明为什么是这个方向，需要能让人看出建议与前面诊断之间的因果关系。`;
}
