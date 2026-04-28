"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface TimePickerProps {
  onSelect: (hour: number | null, minute: number | null) => void;
  hideConfirm?: boolean;
  autoConfirm?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: i.toString().padStart(2, "0") }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ value: i, label: i.toString().padStart(2, "0") }));

export default function TimePicker({ onSelect, hideConfirm, autoConfirm }: TimePickerProps) {
  const t = useTranslations('onboarding.timePicker');
  const [h, setH] = useState<number | null>(null);
  const [m, setM] = useState<number | null>(null);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newH = val === "" ? null : Number(val);
    setH(newH);
    if (newH === null) {
      setM(null);
      if (autoConfirm) onSelect(null, null);
    } else if (autoConfirm) {
      onSelect(newH, m);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newM = val === "" ? null : Number(val);
    setM(newM);
    if (autoConfirm) onSelect(h, newM);
  };

  return (
    <div className="text-center max-w-md mx-auto w-full">
      {!hideConfirm && (
        <>
          <motion.h2
            className="text-2xl md:text-3xl font-light mb-4"
            style={{ color: 'hsl(var(--foreground))' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {t('title')}
          </motion.h2>

          <motion.p
            className="text-sm mb-8"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {t('description')}
          </motion.p>
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 w-full">
        <label className="block text-sm mb-2 text-left px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {t('hourLabel')}
        </label>
        <div className="relative">
          <select
            value={h ?? ""}
            onChange={handleHourChange}
            className="w-full appearance-none px-6 py-4 pr-12 rounded-2xl text-lg font-medium cursor-pointer focus:outline-none"
            style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))' }}
          >
            <option value="">{t('hourPlaceholder')}</option>
            {HOURS.map((hour) => (
              <option key={hour.value} value={hour.value}>{hour.label}:00</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'hsl(var(--muted-foreground))' }} />
        </div>
      </motion.div>

      <AnimatePresence>
        {h !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 w-full overflow-hidden"
          >
            <div className="pt-4">
              <label className="block text-sm mb-2 text-left px-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('minuteLabel')}
              </label>
              <div className="relative">
                <select
                  value={m ?? ""}
                  onChange={handleMinuteChange}
                  className="w-full appearance-none px-6 py-4 pr-12 rounded-2xl text-lg font-medium cursor-pointer focus:outline-none"
                  style={{ background: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: '1px solid hsl(var(--border))' }}
                >
                  <option value="">{t('minutePlaceholder')}</option>
                  {MINUTES.map((minute) => (
                    <option key={minute.value} value={minute.value}>{minute.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ color: 'hsl(var(--muted-foreground))' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hideConfirm && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => onSelect(h, m)}
          className="w-full px-12 py-4 text-base font-medium rounded-full hover:opacity-90 transition-all duration-300"
          style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {h === null ? t('skip') : t('next')}
        </motion.button>
      )}
    </div>
  );
}
