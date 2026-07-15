import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeWuxingAssessment, toWuxingVector, toBigFiveVector, combinePersonalitySimilarity, computeFreshnessScore, combineTotalScore } from '@mindo/core';
import type { BaziSnapshot } from '@mindo/core';
import { mindCardsAdminClient as admin } from '@/lib/mindCards/adminClient';
import { filterVisibleCards } from '@/lib/mindCards/visibility';
import { computeFavoritedSet } from '@/lib/mindCards/favorites';
import { CANDIDATE_POOL_WINDOW_DAYS } from '@/lib/mindCards/constants';

const RESULT_SIZE = 20;

// GET /api/mind-cards/recommend — 推荐tab，60%人格相似度+40%新鲜度加权排序，已读去重
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 浏览者"我方"各因子向量：本人档案的实时最新计算，不依赖浏览者是否发过卡片
    const viewerMetrics = new Map<string, unknown>();
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
        viewerMetrics.set('wuxing', toWuxingVector(assessment));
      }

      const { data: bigfiveAssessment } = await supabase
        .from('bigfive_assessments')
        .select('domain_scores')
        .eq('profile_id', selfProfile.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (bigfiveAssessment?.domain_scores) {
        viewerMetrics.set('bigfive', toBigFiveVector(bigfiveAssessment.domain_scores as Record<string, number>));
      }
    }

    const windowStart = new Date(Date.now() - CANDIDATE_POOL_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

    const { data: candidates, error: candidatesError } = await admin
      .from('mind_cards')
      .select('id, user_id, content, visibility, style, created_at')
      .gte('created_at', windowStart);

    if (candidatesError) {
      console.error('[mind-cards/recommend GET] candidates error:', candidatesError);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let pool = candidates ?? [];

    // 排除已读
    if (pool.length > 0) {
      const { data: viewedRows } = await admin
        .from('mind_card_views')
        .select('card_id')
        .eq('viewer_id', user.id)
        .in('card_id', pool.map((c) => c.id));

      const viewedIds = new Set((viewedRows ?? []).map((v) => v.card_id));
      pool = pool.filter((c) => !viewedIds.has(c.id));
    }

    const visiblePool = await filterVisibleCards(admin, user.id, pool);
    if (visiblePool.length === 0) {
      return NextResponse.json({ cards: [] });
    }

    // 批量拉候选卡片的五行metrics，按card_id分组
    const { data: metricRows } = await admin
      .from('mind_card_metrics')
      .select('card_id, metric_type, metric_data')
      .in('card_id', visiblePool.map((c) => c.id));

    const metricsByCard = new Map<string, Map<string, unknown>>();
    for (const row of metricRows ?? []) {
      if (!metricsByCard.has(row.card_id)) metricsByCard.set(row.card_id, new Map());
      metricsByCard.get(row.card_id)!.set(row.metric_type, row.metric_data);
    }

    const now = new Date();
    const scored = visiblePool.map((card) => {
      const cardMetrics = metricsByCard.get(card.id) ?? new Map<string, unknown>();
      const similarity = combinePersonalitySimilarity(viewerMetrics, cardMetrics);
      const freshness = computeFreshnessScore(card.created_at, now);
      return { card, total: combineTotalScore(similarity, freshness) };
    });

    scored.sort((a, b) => b.total - a.total);
    const topCards = scored.slice(0, RESULT_SIZE).map((s) => s.card);

    const cardIds = topCards.map((c) => c.id);
    let myLikes = new Set<string>();
    if (cardIds.length > 0) {
      const { data: likes } = await admin
        .from('mind_card_likes')
        .select('card_id')
        .eq('user_id', user.id)
        .in('card_id', cardIds);
      myLikes = new Set((likes ?? []).map((l) => l.card_id));
    }
    const myFavorites = await computeFavoritedSet(admin, user.id, cardIds);

    const cards = topCards.map((c) => ({
      ...c,
      liked: myLikes.has(c.id),
      favorited: myFavorites.has(c.id),
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[mind-cards/recommend GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
