import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  lemonSqueezySetup,
  createCheckout,
} from '@lemonsqueezy/lemonsqueezy.js';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { assessment_type, profile_id } = body;

    if (!assessment_type || !profile_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('assessment_type', assessment_type)
      .eq('is_active', true)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mindo-web.vercel.app';

    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      product.lemon_variant_id,
      {
        checkoutOptions: {
          embed: false,
          media: false,
        },
        checkoutData: {
          email: userData?.email || user.email || '',
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
