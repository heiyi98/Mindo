import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';

export async function requireAuth(locale: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/', locale });
  }

  return user!;
}

export async function requireProfile(locale: string) {
  const user = await requireAuth(locale);
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, birth_date, is_self')
    .eq('user_id', user.id)
    .eq('is_self', true)
    .order('created_at', { ascending: true })
    .limit(1);

  const profile = profiles?.[0] || null;

  if (!profile) {
    redirect({ href: '/onboarding', locale });
  }

  return { user, profile };
}
