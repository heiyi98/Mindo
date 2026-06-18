'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BigFiveReport } from '@mindo/core';
import { BIGFIVE_COLORS, DOMAIN_FULL, DOMAIN_ORDER, DOMAIN_LETTER } from '@/lib/bigfive-constants';

export interface StandardEntry {
  t: number;
  label: string;
  z: number;
}

export interface StandardScores {
  domains: Record<string, StandardEntry>;
  facets: Record<string, StandardEntry>;
}

// T score (20–80) → bar fill percentage
function tToPercent(t: number): number {
  return Math.round((t - 20) / 60 * 100);
}

interface BigFiveFacetsProps {
  report: BigFiveReport;
  standardScores?: StandardScores | null;
}

export default function BigFiveFacets({ report, standardScores }: BigFiveFacetsProps) {
  const t = useTranslations('bigfive.domains');
  const tFacets = useTranslations('bigfive.facets');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  if (!standardScores) {
    return (
      <div
        className="w-full h-12 rounded-2xl"
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
        }}
      />
    );
  }

  const orderedDomains = DOMAIN_ORDER
    .map(full => report.domains.find(d => d.domain === DOMAIN_LETTER[full]))
    .filter((d): d is NonNullable<typeof report.domains[number]> => d != null);

  return (
    <div className="w-full space-y-2">
      {orderedDomains.map(domain => {
        const isExpanded = expandedDomain === domain.domain;
        const fullName = DOMAIN_FULL[domain.domain];
        const color = BIGFIVE_COLORS[fullName as keyof typeof BIGFIVE_COLORS];
        const ss = standardScores.domains[fullName];

        return (
          <div
            key={domain.domain}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <button
              onClick={() => setExpandedDomain(isExpanded ? null : domain.domain)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/20"
              style={{ cursor: 'pointer' }}
            >
              <div className="flex items-center gap-3 flex-1">
                <span
                  // 💡 修复：将宽度从 w-24 提升到绝对安全的 150px，并防止压缩
                  className="text-sm font-light w-[150px] text-left flex-shrink-0"
                  style={{ color }}
                >
                  {t(domain.domain as any)}
                </span>

                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'hsl(var(--muted))' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: ss ? `${tToPercent(ss.t)}%` : '0%' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '5rem', justifyContent: 'flex-end' }}>
                  {ss ? (
                    <>
                      <span style={{ minWidth: '2rem', textAlign: 'right', fontWeight: 500, fontSize: 14, color: 'hsl(var(--foreground))' }}>
                        {ss.t}
                      </span>
                      <span style={{ color: 'hsl(var(--muted-foreground) / 0.4)', fontSize: 13 }}>|</span>
                      <span style={{ minWidth: '2rem', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                        {ss.label}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground) / 0.3)' }}>—</span>
                  )}
                </div>
              </div>
              <ChevronDown
                size={14}
                className="ml-3 flex-shrink-0 transition-transform duration-200"
                style={{
                  color: 'hsl(var(--muted-foreground))',
                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-4 pb-3 space-y-2"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                  >
                    {domain.facets.map(facet => {
                      const fs = standardScores.facets[facet.facet];

                      return (
                        <div
                          key={facet.facet}
                          className="flex items-center gap-3 pt-2"
                        >
                          <span
                            // 💡 修复：将宽度从 w-32 提升到绝对安全的 150px
                            className="text-xs font-light w-[150px] text-left flex-shrink-0"
                            style={{ color }}
                          >
                            {tFacets(facet.facet as any)}
                          </span>
                          <div
                            className="flex-1 h-1 rounded-full overflow-hidden"
                            style={{ background: 'hsl(var(--muted))' }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: fs ? `${tToPercent(fs.t)}%` : '0%' }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: `${color}99` }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '5rem', justifyContent: 'flex-end' }}>
                            {fs ? (
                              <>
                                <span style={{ minWidth: '2rem', textAlign: 'right', fontWeight: 500, fontSize: 12, color: 'hsl(var(--foreground))' }}>
                                  {fs.t}
                                </span>
                                <span style={{ color: 'hsl(var(--muted-foreground) / 0.4)', fontSize: 12 }}>|</span>
                                <span style={{ minWidth: '2rem', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                                  {fs.label}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground) / 0.3)' }}>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}