import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeWuxingAssessment, toWuxingVector, toBigFiveVector, wuxingSimilarity, bigFiveSimilarity } from '@mindo/core';
import type { BaziSnapshot, WuxingVector, BigFiveVector } from '@mindo/core';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { filterVisibleCards } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { computeBehaviorCandidateAuthors } from '@/lib/mindCards/behaviorCandidates';
import { CANDIDATE_POOL_WINDOW_DAYS } from '@/lib/mindCards/constants';

// 四线并行选卡（Mindo-片语.md 第三十四节）：不再是"60%相似度+40%新鲜度"混合成
// 一个分数，而是八字相似度/大五相似度/行为共现/随机四条完全独立的线各自选卡，
// 拼成一组卡组——目的是让"命理相似度这套算法准不准"能被干净地单独验证，不被
// 行为数据或新鲜度掺在一起分不清谁起作用。
const RESULT_SIZE = 10;

// 已读卡片不再从候选池整个剔除——卡片数量少的阶段，硬性剔除会导致用户很快把
// 候选池刷完、之后无内容可看。改成对已读卡片的最终排序分打折，让它明显往后退，
// 但仍有机会被刷到。折扣比例是可调的运营参数，不满意可以随时调整。
const VIEWED_SCORE_MULTIPLIER = 0.3;

type LineTag = 'wuxing' | 'bigfive' | 'behavior' | 'random';

interface CardRow {
  id: string;
  user_id: string;
  content: string;
  visibility: string;
  style: unknown;
  created_at: string;
}

// 两个已有文档案例的精确复现——同时具备八字+大五：1,4,7=八字 2,5,8=大五
// 3,6,9=行为 10=随机；只有八字没有大五：1,2,4,7=八字 3,5,6,9=行为 8,10=随机。
// 前端不需要知道"这张卡是哪条线来的"，这个顺序只是让四条线在卡组里交替出现、
// 不扎堆在一起，不是什么严格业务规则，所以就地写死这两个案例，不做成通用算法。
const POSITION_SEQUENCE_BOTH: LineTag[] = ['wuxing', 'bigfive', 'behavior', 'wuxing', 'bigfive', 'behavior', 'wuxing', 'bigfive', 'behavior', 'random'];
const POSITION_SEQUENCE_WUXING_ONLY: LineTag[] = ['wuxing', 'wuxing', 'behavior', 'wuxing', 'behavior', 'behavior', 'wuxing', 'random', 'behavior', 'random'];
// 两个因子都没有的边界情况文档未定义——沿用"某条线的名额被移除时，平分给
// 剩余线"这条已验证过的规则往下推：八字的4个名额+大五的0个名额全部移除后，
// 剩下behavior/random两条线平分，6/4。这里直接写死这个推导结果。
const POSITION_SEQUENCE_NEITHER: LineTag[] = ['behavior', 'random', 'behavior', 'random', 'behavior', 'random', 'behavior', 'random', 'behavior', 'behavior'];
// 位置对应的线如果候选不够（那条线的队列已经空了），按这个优先级从别的还有
// 余量的队列里借一张顶上，保证最终卡组尽量凑满，不会因为某一条线候选不足
// 就白白少一张——random因为承接了所有线的"缺口"，天然更可能有余量，排第一
const FALLBACK_ORDER: LineTag[] = ['random', 'behavior', 'bigfive', 'wuxing'];

interface ScoredCard {
  card: CardRow;
  score: number;
}

function pickTopN(scored: ScoredCard[], count: number, usedIds: Set<string>): CardRow[] {
  const picked: CardRow[] = [];
  for (const item of scored) {
    if (picked.length >= count) break;
    if (usedIds.has(item.card.id)) continue;
    picked.push(item.card);
    usedIds.add(item.card.id);
  }
  return picked;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// GET /api/mind-cards/recommend — 推荐tab，四线并行选卡拼成一组卡组，
// 已读降权（不剔除），排除浏览者自己发布的卡片
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 浏览者"我方"各因子向量：本人档案的实时最新计算，不依赖浏览者是否发过卡片
    let viewerWuxing: WuxingVector | null = null;
    let viewerBigfive: BigFiveVector | null = null;
    const { data: selfProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_self', true)
      .maybeSingle();

    if (selfProfile) {
      const { data: snapshot } = await supabase
        .from('bazi_snapshots')
        .select('calculation_result')
        .eq('profile_id', selfProfile.id)
        .maybeSingle();

      if (snapshot?.calculation_result) {
        const assessment = computeWuxingAssessment(snapshot.calculation_result as BaziSnapshot);
        viewerWuxing = toWuxingVector(assessment);
      }

      const { data: bigfiveAssessment } = await supabase
        .from('bigfive_assessments')
        .select('domain_scores')
        .eq('profile_id', selfProfile.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (bigfiveAssessment?.domain_scores) {
        viewerBigfive = toBigFiveVector(bigfiveAssessment.domain_scores as Record<string, number>);
      }
    }

    const hasWuxing = viewerWuxing !== null;
    const hasBigfive = viewerBigfive !== null;

    const windowStart = new Date(Date.now() - CANDIDATE_POOL_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

    const { data: candidates, error: candidatesError } = await admin
      .from('mind_cards')
      .select('id, user_id, content, visibility, style, created_at')
      .gte('created_at', windowStart)
      // 明确排除浏览者自己发布的卡片
      .neq('user_id', user.id);

    if (candidatesError) {
      console.error('[mind-cards/recommend GET] candidates error:', candidatesError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const pool = (candidates ?? []) as CardRow[];

    // 铁律：四条线都必须从这一份已经过滤过可见性的候选池里挑，任何一条线都
    // 不允许各自重新判断一次可见性（见 Mindo-片语.md 第三节/第三十四节3）
    const visiblePool = await filterVisibleCards(admin, user.id, pool);
    if (visiblePool.length === 0) {
      return NextResponse.json({ cards: [] });
    }

    // 已读集合：只用来给已读卡片的排序分打折，不再用来过滤候选池
    const viewedIds = new Set<string>();
    const { data: viewedRows } = await admin
      .from('mind_card_views')
      .select('card_id')
      .eq('viewer_id', user.id)
      .in('card_id', visiblePool.map((c) => c.id));
    (viewedRows ?? []).forEach((v) => viewedIds.add(v.card_id));

    const discount = (cardId: string) => (viewedIds.has(cardId) ? VIEWED_SCORE_MULTIPLIER : 1);

    // 批量拉候选卡片的五行/大五metrics，按card_id分组
    const { data: metricRows } = await admin
      .from('mind_card_metrics')
      .select('card_id, metric_type, metric_data')
      .in('card_id', visiblePool.map((c) => c.id));

    const wuxingByCard = new Map<string, WuxingVector>();
    const bigfiveByCard = new Map<string, BigFiveVector>();
    for (const row of metricRows ?? []) {
      if (row.metric_type === 'wuxing') wuxingByCard.set(row.card_id, row.metric_data as WuxingVector);
      else if (row.metric_type === 'bigfive') bigfiveByCard.set(row.card_id, row.metric_data as BigFiveVector);
    }

    const usedIds = new Set<string>();
    const sourceByCardId = new Map<string, LineTag>();

    // ===== 线1：八字相似度 =====
    let wuxingPicked: CardRow[] = [];
    if (hasWuxing) {
      const scored: ScoredCard[] = visiblePool
        .filter((c) => wuxingByCard.has(c.id))
        .map((card) => ({ card, score: wuxingSimilarity(viewerWuxing as WuxingVector, wuxingByCard.get(card.id)!) * discount(card.id) }));
      scored.sort((a, b) => b.score - a.score);
      const wuxingTarget = hasBigfive ? 3 : 4;
      wuxingPicked = pickTopN(scored, wuxingTarget, usedIds);
      for (const c of wuxingPicked) sourceByCardId.set(c.id, 'wuxing');
    }

    // ===== 线2：大五相似度 =====
    let bigfivePicked: CardRow[] = [];
    if (hasBigfive) {
      const scored: ScoredCard[] = visiblePool
        .filter((c) => bigfiveByCard.has(c.id))
        .map((card) => ({ card, score: bigFiveSimilarity(viewerBigfive as BigFiveVector, bigfiveByCard.get(card.id)!) * discount(card.id) }));
      scored.sort((a, b) => b.score - a.score);
      bigfivePicked = pickTopN(scored, 3, usedIds);
      for (const c of bigfivePicked) sourceByCardId.set(c.id, 'bigfive');
    }

    // ===== 线3：行为共现 =====
    const behaviorAuthors = await computeBehaviorCandidateAuthors(admin, user.id);
    const authorRank = new Map(behaviorAuthors.map((a) => [a.authorId, a.coOccurrenceCount]));
    const behaviorScored: ScoredCard[] = visiblePool
      .filter((c) => authorRank.has(c.user_id))
      .map((card) => ({ card, score: (authorRank.get(card.user_id) ?? 0) * discount(card.id) }));
    behaviorScored.sort((a, b) => b.score - a.score || (a.card.created_at < b.card.created_at ? 1 : -1));
    const behaviorTarget = hasWuxing ? (hasBigfive ? 3 : 4) : 6;
    const behaviorPicked = pickTopN(behaviorScored, behaviorTarget, usedIds);
    for (const c of behaviorPicked) sourceByCardId.set(c.id, 'behavior');

    // ===== 线4：随机——名额=10减去前三条线实际选出的数量，任何一条线候选
    // 不足时，缺口自动全部转给随机线补足，保证卡组尽量凑满10张 =====
    const pickedSoFar = wuxingPicked.length + bigfivePicked.length + behaviorPicked.length;
    const randomTarget = Math.max(0, RESULT_SIZE - pickedSoFar);
    const remainingPool = shuffle(visiblePool.filter((c) => !usedIds.has(c.id)));
    const randomPicked = remainingPool.slice(0, randomTarget);
    randomPicked.forEach((c) => usedIds.add(c.id));
    for (const c of randomPicked) sourceByCardId.set(c.id, 'random');

    // ===== 组装成最终卡组，按文档定下的交替顺序排列 =====
    const queues: Record<LineTag, CardRow[]> = {
      wuxing: [...wuxingPicked],
      bigfive: [...bigfivePicked],
      behavior: [...behaviorPicked],
      random: [...randomPicked],
    };
    const positionSequence = hasWuxing && hasBigfive
      ? POSITION_SEQUENCE_BOTH
      : hasWuxing
        ? POSITION_SEQUENCE_WUXING_ONLY
        : POSITION_SEQUENCE_NEITHER;

    const finalCards: CardRow[] = [];
    for (const tag of positionSequence) {
      let card = queues[tag].shift();
      if (!card) {
        for (const fb of FALLBACK_ORDER) {
          if (queues[fb].length > 0) { card = queues[fb].shift(); break; }
        }
      }
      if (card) finalCards.push(card);
    }

    // 每张卡片记一笔"是哪条线选出来的"——普通字符串，不设枚举约束，以后加新线
    // 只是多一个新的文字值，不需要改表结构（见第三十四节2）
    const sourceRows = finalCards.map((c) => ({
      viewer_id: user.id,
      card_id: c.id,
      source: sourceByCardId.get(c.id) ?? 'random',
    }));
    if (sourceRows.length > 0) {
      const { error: sourceError } = await admin.from('mind_card_recommendation_sources').insert(sourceRows);
      if (sourceError) {
        // 记录来源失败不影响推荐本身正常返回
        console.error('[mind-cards/recommend GET] source insert error:', sourceError);
      }
    }

    const cardIds = finalCards.map((c) => c.id);
    const myFavorites = await computeFavoritedSet(admin, user.id, cardIds);

    // is_own：候选池已经在查询阶段排除了浏览者自己的卡片，这里理论上恒为false，
    // 仍如实计算，保持所有返回卡片列表接口的字段行为一致
    const cards = finalCards.map((c) => ({
      ...c,
      favorited: myFavorites.has(c.id),
      is_own: c.user_id === user.id,
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[mind-cards/recommend GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
