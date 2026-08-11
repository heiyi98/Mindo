import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth/requireAuth';
import { paymentsRepository } from '@/lib/payments/adminClient';
import {
  lemonSqueezySetup,
  createCheckout,
} from '@lemonsqueezy/lemonsqueezy.js';

export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { assessment_type, profile_id } = body;

    if (!assessment_type || !profile_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = await paymentsRepository.getActiveProduct(assessment_type);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

    const email = await paymentsRepository.getUserEmail(user.id);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindo-gold.vercel.app';

    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      product.lemon_variant_id,
      {
        checkoutOptions: {
          embed: false,
          media: false,
        },
        checkoutData: {
          email: email || user.email || '',
          custom: {
            user_id: user.id,
            profile_id,
            assessment_type,
          },
        },
        productOptions: {
          redirectUrl: `${siteUrl}/en/dashboard/divination/${assessment_type}?payment=success`,
          receiptButtonText: 'View My Reading',
          receiptThankYouNote: 'Your AI reading is being generated. Check back in a moment.',
        },
      }
    );

    const checkoutUrl = checkout.data?.data?.attributes?.url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
