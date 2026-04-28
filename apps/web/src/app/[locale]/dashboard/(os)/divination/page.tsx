'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Link } from '@/i18n/navigation';
import { Check, Lock, ChevronRight } from 'lucide-react';
import {
  ASSESSMENTS,
  getAssessmentsByCategory,
  type AssessmentCategory,
} from '@/config/assessments';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import { useTopBar } from '@/components/os/TopBarContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';

interface AssessmentStatusItem {
  id: string;
  isCompleted: boolean;
  hasAiReading: boolean;
  isAvailable: boolean;
}

export default function DivinationPage() {
  const t = useTranslations();
  const { currentProfile } = useCurrentProfile();
  const { setContent } = useTopBar();
  const [statusMap, setStatusMap] = useState<Map<string, AssessmentStatusItem>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setContent({ left: <ProfileSwitcher /> });
    return () => setContent({});
  }, [setContent]);

  useEffect(() => {
    if (!currentProfile) return;
    fetch(`/api/assessments/status?profile_id=${currentProfile.id}`)
      .then(res => res.json())
      .then(data => {
        const map = new Map<string, AssessmentStatusItem>(
          (data.status || []).map((s: AssessmentStatusItem) => [s.id, s])
        );
        setStatusMap(map);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [currentProfile?.id]);

  const categories: { key: AssessmentCategory; labelKey: string }[] = [
    { key: 'destiny', labelKey: 'divination.destiny' },
    { key: 'psychology', labelKey: 'divination.psychology' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-light tracking-[0.3em] uppercase"
        style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
      >
        {t('divination.title')}
      </motion.h1>

      {categories.map(({ key, labelKey }) => {
        const items = getAssessmentsByCategory(key);
        return (
          <motion.section
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p
              className="text-xs font-light tracking-[0.2em] uppercase mb-3"
              style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}
            >
              {t(labelKey)}
            </p>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              {items.map((assessment, idx) => {
                const status = statusMap.get(assessment.id);
                const isCompleted = status?.isCompleted ?? false;
                const isAvailable = assessment.isAvailable;

                return (
                  <div key={assessment.id}>
                    {idx > 0 && (
                      <div style={{ height: 1, background: 'hsl(var(--border))' }} />
                    )}
                    {isAvailable ? (
                      <Link
                        href={`/dashboard/divination/${assessment.route}` as any}
                        className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          {isCompleted ? (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: 'hsl(var(--foreground) / 0.1)' }}
                            >
                              <Check size={11} style={{ color: 'hsl(var(--foreground))' }} />
                            </div>
                          ) : (
                            <div
                              className="w-5 h-5 rounded-full flex-shrink-0"
                              style={{ border: '1px solid hsl(var(--border))' }}
                            />
                          )}
                          <div>
                            <span
                              className="text-sm font-light"
                              style={{ color: 'hsl(var(--foreground))' }}
                            >
                              {t(assessment.nameKey)}
                            </span>
                            {assessment.estimatedMinutes && !isCompleted && (
                              <span
                                className="text-xs ml-2"
                                style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                              >
                                ~{assessment.estimatedMinutes}{t('divination.minutes')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                      </Link>
                    ) : (
                      <div
                        className="flex items-center justify-between px-4 py-4"
                        style={{ opacity: 0.4 }}
                      >
                        <div className="flex items-center gap-3">
                          <Lock size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                          <span
                            className="text-sm font-light"
                            style={{ color: 'hsl(var(--foreground))' }}
                          >
                            {t(assessment.nameKey)}
                          </span>
                        </div>
                        <span
                          className="text-xs"
                          style={{ color: 'hsl(var(--muted-foreground))' }}
                        >
                          {t('divination.comingSoon')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
