'use client';
import { useParams } from 'next/navigation';
import MindCardsProfileView from '@/components/modules/mindcards/MindCardsProfileView';

export default function MindCardsHandleProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  return <MindCardsProfileView targetHandle={handle} />;
}
