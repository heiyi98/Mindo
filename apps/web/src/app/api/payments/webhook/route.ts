import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    await supabase.from('purchases').insert({
      user_id: userId,
      snapshot_type: assessmentType,
      amount_cents: amountCents,
      currency: (currency || 'USD').toLowerCase(),
      provider: 'lemonsqueezy',
      provider_order_id: String(orderId),
      status: 'completed',
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindo-web.vercel.app';
    await fetch(`${baseUrl}/api/ai/reading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
      },
      body: JSON.stringify({ userId, profileId, assessmentType }),
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
