import { requireAuth } from '@/lib/auth/requireAuth';
import MindCardsComposeView from '@/components/modules/mindcards/MindCardsComposeView';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function MindCardsComposePage({ params }: Props) {
  const { locale } = await params;
  await requireAuth(locale);

  return <MindCardsComposeView />;
}
