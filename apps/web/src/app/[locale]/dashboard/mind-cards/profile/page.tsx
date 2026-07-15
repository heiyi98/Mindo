import { requireAuth } from '@/lib/auth/requireAuth';
import MindCardsProfileView from '@/components/modules/mindcards/MindCardsProfileView';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function MindCardsProfilePage({ params }: Props) {
  const { locale } = await params;
  await requireAuth(locale);

  return <MindCardsProfileView />;
}
