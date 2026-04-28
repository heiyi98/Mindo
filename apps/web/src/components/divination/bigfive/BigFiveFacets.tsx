'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BigFiveReport } from '@mindo/core';

const MAX_FACET_SCORE = 20;

const DOMAIN_COLORS: Record<string, string> = {
  O: '#8b5cf6',
  C: '#3b82f6',
  E: '#f59e0b',
  A: '#10b981',
  N: '#f43f5e',
};

interface BigFiveFacetsProps {
  report: BigFiveReport;
}

export default function BigFiveFacets({ report }: BigFiveFacetsProps) {
  const t = useTranslations('bigfive.domains');
  const tFacets = useTranslations('bigfive.facets');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  return (
    <div className="w-full space-y-2">
      {report.domains.map(domain => {
        const isExpanded = expandedDomain === domain.domain;
        const color = DOMAIN_COLORS[domain.domain];
        const domainPercent = Math.round((domain.score / 120) * 100);

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
                  className="text-sm font-light w-24 text-left"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {t(domain.domain as any)}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'hsl(var(--muted))' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${domainPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <span
                  className="text-sm font-light w-8 text-right"
                  style={{ color }}
                >
                  {domainPercent}
                </span>
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
                      const facetPercent = Math.round(
                        (facet.score / MAX_FACET_SCORE) * 100
                      );
                      return (
                        <div
                          key={facet.facet}
                          className="flex items-center gap-3 pt-2"
                        >
                          <span
                            className="text-xs font-light w-32 text-left flex-shrink-0"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                          >
                            {tFacets(facet.facet as any)}
                          </span>
                          <div
                            className="flex-1 h-1 rounded-full overflow-hidden"
                            style={{ background: 'hsl(var(--muted))' }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${facetPercent}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: `${color}99` }}
                            />
                          </div>
                          <span
                            className="text-xs w-8 text-right flex-shrink-0"
                            style={{ color: 'hsl(var(--muted-foreground))' }}
                          >
                            {facetPercent}
                          </span>
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
