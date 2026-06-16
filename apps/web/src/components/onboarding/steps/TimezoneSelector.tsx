'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TIMEZONE_OPTIONS, type TimezoneOption } from '@/lib/timezones';

interface TimezoneSelectorProps {
  selectedIana: string;
  onChange: (tz: TimezoneOption) => void;
}

export default function TimezoneSelector({ selectedIana, onChange }: TimezoneSelectorProps) {
  const t = useTranslations('onboarding.timezonePicker');
  const [isOpen, setIsOpen] = useState(false);
  const selectedRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = TIMEZONE_OPTIONS.find(tz => tz.ianaName === selectedIana)
    ?? TIMEZONE_OPTIONS[0];

  useEffect(() => {
    if (isOpen && selectedRef.current) {
      setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full overflow-visible"
    >
      <div className="pt-4" ref={containerRef}>
        <label
          className="block text-sm mb-2 text-left px-1"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {t('label')}
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full appearance-none px-6 py-4 pr-12 rounded-2xl text-lg font-medium cursor-pointer focus:outline-none text-left"
            style={{
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <span className="text-lg font-medium">
              {selectedOption.offsetLabel}
            </span>
            <span
              className="ml-2 text-sm font-normal"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {t(`regions.${selectedOption.regions}`)}
            </span>
          </button>
          <ChevronDown
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-transform duration-200"
            style={{
              color: 'hsl(var(--muted-foreground))',
              transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
            }}
          />
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                maxHeight: '240px',
                overflowY: 'auto',
              }}
            >
              {TIMEZONE_OPTIONS.map((tz) => {
                const isSelected = tz.ianaName === selectedIana;
                return (
                  <div
                    key={tz.ianaName}
                    ref={isSelected ? selectedRef : null}
                    onClick={() => { onChange(tz); setIsOpen(false); }}
                    className="px-4 py-3 cursor-pointer flex items-center justify-between transition-colors"
                    style={{
                      background: isSelected
                        ? 'hsl(var(--foreground) / 0.08)'
                        : 'transparent',
                      borderBottom: '1px solid hsl(var(--border) / 0.5)',
                    }}
                  >
                    <div className="flex flex-col text-left">
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: isSelected
                            ? 'hsl(var(--foreground))'
                            : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {tz.offsetLabel}
                        {tz.hasDst && (
                          <span className="ml-1 text-xs opacity-60">
                            {t('dstNote')}
                          </span>
                        )}
                      </span>
                      <span
                        className="text-xs mt-0.5"
                        style={{ color: 'hsl(var(--muted-foreground) / 0.7)' }}
                      >
                        {t(`regions.${tz.regions}`)}
                      </span>
                    </div>
                    {isSelected && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: 'hsl(var(--foreground))' }}
                      />
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
