import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { computeWuxingAssessment, toWuxingVector, toBigFiveVector } from '@mindo/core';
import type { BaziSnapshot } from '@mindo/core';
import { mindCardsRepository as repo } from '@/lib/mindCards/adminClient';
import type { CardVisibility } from '@/lib/mindCards/visibility';
import type { MindCardCardStyle, MindCardRun, MindCardStyleV2 } from '@/lib/mindCards/style';
import { runsToPlainText } from '@/lib/mindCards/style';

const VALID_VISIBILITY: CardVisibility[] = ['private', 'followers', 'friends', 'public'];

// POST /api/mind-cards — 发布片语
export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      runs?: MindCardRun[];
      style?: MindCardCardStyle;
      visibility?: string;
      attachWuxing?: boolean;
      attachBigfive?: boolean;
      // attachDayMaster: 前端切换态，本次不接后端，故意不读取
    };
    const runs = body.runs ?? [];
    const cardStyle = body.style;
    const visibility = body.visibility;
    const attachWuxing = body.attachWuxing === true;
    const attachBigfive = body.attachBigfive === true;

    const content = runsToPlainText(runs).trim();
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    if (!cardStyle) return NextResponse.json({ error: 'Missing style' }, { status: 400 });
    if (!visibility || !VALID_VISIBILITY.includes(visibility as CardVisibility)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    // 附带的命理/心理数据固定取本人档案（is_self=true）关联的最新计算结果，字段级快照，
    // 后续档案修改/重算/删除都不影响这里已经写死的数值
    let selfProfileId: string | null = null;
    const ensureSelfProfile = async () => {
      if (selfProfileId !== null) return selfProfileId;
      selfProfileId = await repo.getSelfProfileId(user.id);
      return selfProfileId;
    };

    let wuxingVector: Record<string, number> | null = null;
    if (attachWuxing) {
      const profileId = await ensureSelfProfile();
      if (!profileId) {
        return NextResponse.json({ error: 'No self profile found for wuxing snapshot' }, { status: 400 });
      }

      const calcResult = await repo.getBaziCalculationResult(profileId);
      if (!calcResult) {
        return NextResponse.json({ error: 'No bazi snapshot found for wuxing snapshot' }, { status: 400 });
      }

      const assessment = computeWuxingAssessment(calcResult as BaziSnapshot);
      wuxingVector = toWuxingVector(assessment);
    }

    let bigfiveVector: Record<string, number> | null = null;
    if (attachBigfive) {
      const profileId = await ensureSelfProfile();
      if (!profileId) {
        return NextResponse.json({ error: 'No self profile found for bigfive snapshot' }, { status: 400 });
      }

      const domainScores = await repo.getBigfiveDomainScores(profileId, user.id);
      if (!domainScores) {
        return NextResponse.json({ error: 'No bigfive assessment found for bigfive snapshot' }, { status: 400 });
      }

      bigfiveVector = toBigFiveVector(domainScores);
    }

    const style: MindCardStyleV2 = { card: cardStyle, runs };

    const { data: card, error: cardError } = await repo.insertCard({
      user_id: user.id,
      content,
      visibility,
      style,
    });

    if (cardError || !card) {
      console.error('[mind-cards POST] insert card error:', cardError);
      return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
    }

    const metricRows = [
      wuxingVector ? { card_id: card.id, metric_type: 'wuxing', metric_data: wuxingVector } : null,
      bigfiveVector ? { card_id: card.id, metric_type: 'bigfive', metric_data: bigfiveVector } : null,
    ].filter((row): row is { card_id: string; metric_type: string; metric_data: Record<string, number> } => row !== null);

    await repo.insertCardMetrics(metricRows);

    return NextResponse.json({ card: { ...card, wuxing: wuxingVector, bigfive: bigfiveVector } });
  } catch (error) {
    console.error('[mind-cards POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
