'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ChevronLeft, Wand2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@/i18n/navigation';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';

interface ProCardDef {
  id: string;
  nameKey: string;
  descKey: string;
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  href: string;
}

const PRO_CARDS: ProCardDef[] = [
  {
    id: 'constitution',
    nameKey: 'assessments.pro.constitutionEntry',
    descKey: 'assessments.pro.constitutionDesc',
    Icon: Wand2,
    href: '/dashboard/assessments/pro/constitution',
  },
];

export default function ProHubPage() {
  const t = useTranslations();
  const router = useRouter();
  const { setContent } = useTopBar();

  const { data: assetsData, isLoading } = useQuery<{ proExpiresAt: string | null }>({
    queryKey: ['payment-assets'],
    queryFn: async () => {
      const res = await fetch('/api/payments/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
  });
  const isProActive = !!assetsData?.proExpiresAt && new Date(assetsData.proExpiresAt).getTime() > Date.now();

  useEffect(() => {
    setContent({
      left: (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <ProfileSwitcher />
        </div>
      ),
    });
    return () => setContent({});
  }, [setContent, router]);

  useEffect(() => {
    if (!isLoading && !isProActive) {
      router.replace('/dashboard/assessments');
    }
  }, [isLoading, isProActive, router]);

  if (!isProActive) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-10">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-light tracking-[0.3em] uppercase"
        style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
      >
        {t('assessments.pro.hubTitle' as any)}
      </motion.h1>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRO_CARDS.map(card => (
            <Link
              key={card.id}
              href={card.href as any}
              className="block transition-transform duration-200 hover:scale-[1.02]"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="rounded-2xl p-5 flex flex-col justify-between aspect-[5/2] transition-all"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              >
                <div style={{ color: 'hsl(var(--foreground))' }}>
                  <card.Icon size={26} />
                </div>
                <div>
                  <h3 className="text-base font-light" style={{ color: 'hsl(var(--foreground))' }}>
                    {t(card.nameKey as any)}
                  </h3>
                  <div className="mt-1 h-10 flex items-start">
                    <p
                      className="text-xs font-light leading-relaxed line-clamp-2"
                      style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                    >
                      {t(card.descKey as any)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
