import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { computeWuxingAssessment, toWuxingVector, toBigFiveVector, wuxingSimilarity, bigFiveSimilarity } from '@mindo/core';
import type { BaziSnapshot, WuxingVector, BigFiveVector } from '@mindo/core';
import { mindCardsAdminClient as admin, mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import { filterVisibleCards, fetchRelationFlags } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { computeBehaviorCandidateAuthors } from '@/lib/mindCards/behaviorCandidates';
import { fetchAuthorMap } from '@/lib/mindCards/authors';
import { CANDIDATE_POOL_WINDOW_DAYS } from '@/lib/mindCards/constants';

const RESULT_SIZE = 10;
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

const POSITION_SEQUENCE_BOTH: LineTag[] = ['wuxing', 'bigfive', 'behavior', 'wuxing', 'bigfive', 'behavior', 'wuxing', 'bigfive', 'behavior', 'random'];
const POSITION_SEQUENCE_WUXING_ONLY: LineTag[] = ['wuxing', 'wuxing', 'behavior', 'wuxing', 'behavior', 'behavior', 'wuxing', 'random', 'behavior', 'random'];
const POSITION_SEQUENCE_NEITHER: LineTag[] = ['behavior', 'random', 'behavior', 'random', 'behavior', 'random', 'behavior', 'random', 'behavior', 'behavior'];
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

export async function GET() {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let viewerWuxing: WuxingVector | null = null;
    let viewerBigfive: BigFiveVector | null = null;
    const selfProfileId = await repo.getSelfProfileId(user.id);

    if (selfProfileId) {
      const calcResult = await repo.getBaziCalculationResult(selfProfileId);
      if (calcResult) {
        const assessment = computeWuxingAssessment(calcResult as BaziSnapshot);
        viewerWuxing = toWuxingVector(assessment);
      }

      const domainScores = await repo.getBigfiveDomainScores(selfProfileId, user.id);
      if (domainScores) {
        viewerBigfive = toBigFiveVector(domainScores);
      }
    }

    const hasWuxing = viewerWuxing !== null;
    const hasBigfive = viewerBigfive !== null;

    const windowStart = new Date(Date.now() - CANDIDATE_POOL_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

    const pool = await repo.listRecentCardsExcludingUser(windowStart, user.id) as CardRow[];

    const visiblePool = await filterVisibleCards(admin, user.id, pool);
    if (visiblePool.length === 0) {
      return NextResponse.json({ cards: [] });
    }

    const viewedIds = await repo.getViewedCardIds(user.id, visiblePool.map((c) => c.id));

    const discount = (cardId: string) => (viewedIds.has(cardId) ? VIEWED_SCORE_MULTIPLIER : 1);

    const metricRows = await repo.getCardMetrics(visiblePool.map((c) => c.id));

    const wuxingByCard = new Map<string, WuxingVector>();
    const bigfiveByCard = new Map<string, BigFiveVector>();
    for (const row of metricRows) {
      if (row.metric_type === 'wuxing') wuxingByCard.set(row.card_id, row.metric_data as WuxingVector);
      else if (row.metric_type === 'bigfive') bigfiveByCard.set(row.card_id, row.metric_data as BigFiveVector);
    }

    const usedIds = new Set<string>();
    const sourceByCardId = new Map<string, LineTag>();

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

    let bigfivePicked: CardRow[] = [];
    if (hasBigfive) {
      const scored: ScoredCard[] = visiblePool
        .filter((c) => bigfiveByCard.has(c.id))
        .map((card) => ({ card, score: bigFiveSimilarity(viewerBigfive as BigFiveVector, bigfiveByCard.get(card.id)!) * discount(card.id) }));
      scored.sort((a, b) => b.score - a.score);
      bigfivePicked = pickTopN(scored, 3, usedIds);
      for (const c of bigfivePicked) sourceByCardId.set(c.id, 'bigfive');
    }

    const behaviorAuthors = await computeBehaviorCandidateAuthors(admin, user.id);
    const authorRank = new Map(behaviorAuthors.map((a) => [a.authorId, a.coOccurrenceCount]));
    const behaviorScored: ScoredCard[] = visiblePool
      .filter((c) => authorRank.has(c.user_id))
      .map((card) => ({ card, score: (authorRank.get(card.user_id) ?? 0) * discount(card.id) }));
    behaviorScored.sort((a, b) => b.score - a.score || (a.card.created_at < b.card.created_at ? 1 : -1));
    const behaviorTarget = hasWuxing ? (hasBigfive ? 3 : 4) : 6;
    const behaviorPicked = pickTopN(behaviorScored, behaviorTarget, usedIds);
    for (const c of behaviorPicked) sourceByCardId.set(c.id, 'behavior');

    const pickedSoFar = wuxingPicked.length + bigfivePicked.length + behaviorPicked.length;
    const randomTarget = Math.max(0, RESULT_SIZE - pickedSoFar);
    const remainingPool = shuffle(visiblePool.filter((c) => !usedIds.has(c.id)));
    const randomPicked = remainingPool.slice(0, randomTarget);
    randomPicked.forEach((c) => usedIds.add(c.id));
    for (const c of randomPicked) sourceByCardId.set(c.id, 'random');

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

    await repo.insertRecommendationSources(
      finalCards.map((c) => ({
        viewer_id: user.id,
        card_id: c.id,
        source: sourceByCardId.get(c.id) ?? 'random',
      }))
    );

    const cardIds = finalCards.map((c) => c.id);
    const myFavorites = await computeFavoritedSet(admin, user.id, cardIds);

    // 作者信息 + 是否已关注——供卡片详情页左下角"名字+关注胶囊"使用
    const authorIds = finalCards.map((c) => c.user_id);
    const authorMap = await fetchAuthorMap(admin, authorIds);
    const relations = await fetchRelationFlags(admin, user.id, authorIds);

    const cards = finalCards.map((c) => ({
      ...c,
      favorited: myFavorites.has(c.id),
      is_own: c.user_id === user.id,
      author: authorMap.get(c.user_id) ?? null,
      authorFollowedByViewer: relations.get(c.user_id)?.viewerFollowsAuthor ?? false,
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[mind-cards/recommend GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
