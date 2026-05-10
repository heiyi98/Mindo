import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const internalSecret = request.headers.get('x-internal-secret');
    if (internalSecret !== process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, profileId, assessmentType } = await request.json();

    const supabase = await createClient();

    const { data: snapshot } = await supabase
      .from('snapshots')
      .select('*')
      .eq('profile_id', profileId)
      .eq('snapshot_type', assessmentType)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const prompt = buildPrompt(assessmentType, profile, snapshot.calculation_result);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const aiReading = result.response.text();

    await supabase
      .from('snapshots')
      .update({
        ai_reading: aiReading,
        ai_reading_generated_at: new Date().toISOString(),
      })
      .eq('id', snapshot.id);

    // Link the most recent unlinked purchase for this user to the snapshot
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'lemonsqueezy')
      .is('snapshot_id', null)
      .order('purchased_at', { ascending: false })
      .limit(1)
      .single();

    if (purchase) {
      await supabase
        .from('purchases')
        .update({ snapshot_id: snapshot.id })
        .eq('id', purchase.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('AI reading error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildPrompt(
  assessmentType: string,
  profile: any,
  calculationResult: any
): string {
  if (assessmentType === 'bazi') {
    const snap = calculationResult as any;
    // 检测七段式新格式
    const isNewFormat = snap?.pillars !== undefined && snap?.relations !== undefined;
    if (isNewFormat) {
      const dataSheet = formatBaziDataSheet(snap, profile);
      return dataSheet;
    }
    // 兼容旧格式
    const pillars = snap?.pillars;
    return `You are an expert in Chinese Four Pillars (BaZi) astrology.
Birth Date: ${profile.birth_date}
Birth Time: ${profile.birth_time || 'Unknown'}
Birth Place: ${profile.birth_place_name || 'Unknown'}
Four Pillars:
- Year: ${pillars?.year?.stem} ${pillars?.year?.branch}
- Month: ${pillars?.month?.stem} ${pillars?.month?.branch}
- Day: ${pillars?.day?.stem} ${pillars?.day?.branch} (Day Master)
- Hour: ${pillars?.hour?.stem} ${pillars?.hour?.branch}
Provide a comprehensive personalized reading.`;
  }
  return `Provide analysis: ${JSON.stringify(calculationResult)}`;
}

function formatBaziDataSheet(snap: any, profile: any): string {
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
  const tianGanLabels: Record<string, string> = {
    Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊',
    Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸'
  };
  const diZhiLabels: Record<string, string> = {
    Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯',
    Chen: '辰', Si: '巳', Wu: '午', Wei: '未',
    Shen: '申', You: '酉', Xu: '戌', Hai: '亥'
  };
  const wuxingLabels: Record<string, string> = {
    Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水'
  };

  lines.push('============================');
  lines.push('BAZI ANALYSIS DATA SHEET');
  lines.push('============================');
  lines.push('');

  // 一、基础命盘
  lines.push('【一、基础命盘】');
  lines.push(`出生日期：${profile.birth_date}`);
  lines.push(`出生时间：${profile.birth_time || '未知'}`);
  lines.push(`出生地点：${profile.birth_place_name || '未知'}`);
  lines.push(`年柱：${tianGanLabels[p.year.stem] || p.year.stem} ${diZhiLabels[p.year.branch] || p.year.branch}`);
  lines.push(`月柱：${tianGanLabels[p.month.stem] || p.month.stem} ${diZhiLabels[p.month.branch] || p.month.branch}`);
  lines.push(`日柱：${tianGanLabels[p.day.stem] || p.day.stem} ${diZhiLabels[p.day.branch] || p.day.branch}（日主）`);
  lines.push(`时柱：${tianGanLabels[p.hour.stem] || p.hour.stem} ${diZhiLabels[p.hour.branch] || p.hour.branch}`);
  lines.push(`月令：${wuxingLabels[p.yuelingWuxing] || p.yuelingWuxing}`);
  lines.push('');

  // 二、藏干明细
  lines.push('【二、藏干明细】');
  const branchGroups = new Map<string, any[]>();
  for (const cg of p.cangGanNodes) {
    if (!branchGroups.has(cg.branchPos)) branchGroups.set(cg.branchPos, []);
    branchGroups.get(cg.branchPos)!.push(cg);
  }
  for (const [pos, cgs] of branchGroups) {
    lines.push(`${posLabels[pos] || pos}（${diZhiLabels[cgs[0].branch] || cgs[0].branch}）：`);
    for (const cg of cgs) {
      lines.push(`  ${tianGanLabels[cg.stem] || cg.stem}（${wuxingLabels[cg.wuxing] || cg.wuxing}）${qiLabels[cg.qi] || cg.qi} 基础分${cg.baseScore}`);
    }
  }
  lines.push('');

  // 三、天干关系
  lines.push('【三、天干关系】');
  const r = snap.relations;
  if (!r.tianGanHe?.length) {
    lines.push('五合：无');
  } else {
    lines.push('五合：');
    for (const he of r.tianGanHe) {
      lines.push(`  ${tianGanLabels[he.stem1] || he.stem1}(${posLabels[he.stem1Pos]}) × ${tianGanLabels[he.stem2] || he.stem2}(${posLabels[he.stem2Pos]}) → 化${wuxingLabels[he.huashen] || he.huashen} [${heLabels[he.result] || he.result}]`);
    }
  }
  if (!r.tianGanChong?.length) {
    lines.push('相冲：无');
  } else {
    lines.push('相冲：');
    for (const chong of r.tianGanChong) {
      lines.push(`  ${tianGanLabels[chong.stem1] || chong.stem1}(${posLabels[chong.stem1Pos]}) 冲 ${tianGanLabels[chong.stem2] || chong.stem2}(${posLabels[chong.stem2Pos]})`);
    }
  }
  lines.push('');

  // 四、地支关系标注
  lines.push('【四、地支关系标注】');
  if (!r.diZhiRelations?.length) {
    lines.push('无');
  } else {
    for (const rel of r.diZhiRelations) {
      const typeLabel = relLabels[rel.type] || rel.type;
      const posStr = rel.positions.map((pos: string) => posLabels[pos] || pos).join(' ');
      const branchStr = rel.branches.map((b: string) => diZhiLabels[b] || b).join(' ');
      const noteStr = rel.note
        ? ' — ' + rel.note.replace(/\b(Zi|Chou|Yin|Mao|Chen|Si|Wu|Wei|Shen|You|Xu|Hai)\b/g,
            (m: string) => diZhiLabels[m] || m)
        : '';
      lines.push(`  ${typeLabel}：${branchStr}（${posStr}）${noteStr}`);
    }
  }
  lines.push('');

  // 五、透根与隐显
  lines.push('【五、透根与隐显】');
  const tg = snap.tougen;
  for (const t of tg.touGenResults) {
    if (!t.roots?.length) {
      lines.push(`  ${posLabels[t.stemPos]}${tianGanLabels[t.stem] || t.stem}（${wuxingLabels[t.wuxing] || t.wuxing}）：无根【露】`);
    } else {
      const rootStrs = t.roots.map((rt: any) =>
        `根在${posLabels[rt.branchPos]}${tianGanLabels[rt.cangganStem] || rt.cangganStem}${qiLabels[rt.qi] || rt.qi}（系数${rt.tougenCoeff.toFixed(2)}）`
      ).join('、');
      lines.push(`  ${posLabels[t.stemPos]}${tianGanLabels[t.stem] || t.stem}（${wuxingLabels[t.wuxing] || t.wuxing}）：${rootStrs}，总系数${t.totalTougenCoeff.toFixed(2)}【透出】`);
    }
  }
  lines.push('藏干隐显：');
  for (const cv of tg.cangGanVisibility) {
    const lockStr = cv.isMuKuLocked ? '【墓库待用】' : '';
    const branchLabel = posLabels[cv.branchPos] || cv.branchPos;
    const qiLabel = qiLabels[cv.qi] || cv.qi;
    lines.push(`  ${branchLabel}${tianGanLabels[cv.stem] || cv.stem}${qiLabel}：【${cv.tag === 'TouChu' ? '透出' : '藏'}】${lockStr}`);
  }
  lines.push('');

  // 六、独立能量
  lines.push('【六、独立能量】');
  for (const node of snap.energy.energyNodes) {
    const typeLabel = node.type === 'TianGan' ? '天干' : '藏干';
    const statusStr = node.outputEnabled
      ? ''
      : `【${node.disableReason === 'HeBan' ? '合绊-对外无效' : '墓库待用-对外无效'}】`;
    lines.push(`  ${typeLabel} ${tianGanLabels[node.stem] || node.stem}(${wuxingLabels[node.wuxing] || node.wuxing}) @ ${posLabels[node.pos] || node.pos}：能量${node.energy.toFixed(2)}${statusStr}`);
  }
  lines.push('');

  // 七、十神挂载
  lines.push('【七、十神挂载】');
  for (const ss of snap.shishen.shishenMap) {
    const energyNode = snap.energy.energyNodes.find((n: any) => n.id === ss.id);
    const posLabel = energyNode ? (posLabels[energyNode.pos] || energyNode.pos) : '';
    const stemLabel = energyNode ? (tianGanLabels[energyNode.stem] || energyNode.stem) : ss.id;
    lines.push(`  ${posLabel}${stemLabel}：${ssLabels[ss.shishen] || ss.shishen}`);
  }
  lines.push('');

  // 八、宫位距离权重
  lines.push('【八、宫位距离权重】');
  lines.push('  年干0.50 | 年支0.45 | 月干1.00 | 月支0.71');
  lines.push('  日支1.00 | 时干1.00 | 时支0.71');
  lines.push('');

  // 九、十神影响力总值
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
