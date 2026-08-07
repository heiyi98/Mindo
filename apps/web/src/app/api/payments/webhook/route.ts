import { NextResponse } from 'next/server';
import { paymentsRepository } from '@/lib/payments/adminClient';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature');

    if (!signature || !process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET);
    const digest = hmac.update(rawBody).digest('hex');

    if (digest !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;

    if (eventName !== 'order_created') {
      return NextResponse.json({ received: true });
    }

    const customData = payload.meta?.custom_data;
    const userId = customData?.user_id;
    const profileId = customData?.profile_id;
    const assessmentType = customData?.assessment_type;

    if (!userId || !profileId || !assessmentType) {
      return NextResponse.json({ error: 'Missing custom data' }, { status: 400 });
    }

    const orderId = payload.data?.id;
    // LS sends amount in cents
    const amountCents = payload.data?.attributes?.total;
    const currency = payload.data?.attributes?.currency;

    await paymentsRepository.insertLegacyPurchase({
      userId,
      snapshotType: assessmentType,
      amountCents,
      currency: (currency || 'USD').toLowerCase(),
      providerOrderId: String(orderId),
    });

    // 原本这里会直接调 /api/ai/reading 触发生成，跳过了新付费系统的扣款/核销逻辑
    // ——这条Lemon Squeezy流程本身依赖的products/purchases表已删，现在还是打不通，
    // 已按用户决定去掉这处直接触发调用，不再留这个跳过扣款判断的入口

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
