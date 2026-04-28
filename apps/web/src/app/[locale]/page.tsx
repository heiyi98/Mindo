import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { LandingContent } from './LandingContent';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (profiles && profiles.length > 0) {
      redirect({ href: '/dashboard', locale });
    } else {
      redirect({ href: '/onboarding', locale });
    }
  }

  return <LandingContent />;
}
