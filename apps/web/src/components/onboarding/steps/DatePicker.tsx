"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface DatePickerProps {
  onSelect: (year: number, month: number, day: number) => void;
  hideConfirm?: boolean;
  autoConfirm?: boolean;
  initialYear?: number;
  initialMonth?: number;
  initialDay?: number;
}

export default function DatePicker({ onSelect, hideConfirm, autoConfirm, initialYear, initialMonth, initialDay }: DatePickerProps) {
  const t = useTranslations('onboarding.datePicker');

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(initialYear ?? currentYear - 30);
  const [month, setMonth] = useState<number>(initialMonth ?? 1);
  const [day, setDay] = useState<number>(initialDay ?? 1);

  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);

  const handleChange = (field: 'year' | 'month' | 'day', val: number) => {
    let newYear = year, newMonth = month, newDay = day;
    if (field === 'year') { setYear(val); newYear = val; }
    else if (field === 'month') { setMonth(val); newMonth = val; }
    else { setDay(val); newDay = val; }
    if (autoConfirm) onSelect(newYear, newMonth, newDay);
  };

  return (
    <div className="text-center">
      {!hideConfirm && (
        <motion.h2
          className="text-2xl md:text-3xl font-light mb-12"
          style={{ color: 'hsl(var(--foreground))' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t('title')}
        </motion.h2>
      )}

      <div className="flex items-center justify-center gap-4 md:gap-8 mb-12">
        {[
          { label: t('year'), value: year, field: 'year' as const, options: years },
          { label: t('month'), value: month, field: 'month' as const, options: months },
          { label: t('day'), value: day, field: 'day' as const, options: days },
        ].map(({ label, value, field, options }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className="relative"
          >
            <label
              className="block text-sm mb-2"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {label}
            </label>
            <div className="relative">
              <select
                value={value}
                onChange={(e) => handleChange(field, Number(e.target.value))}
                className="appearance-none px-6 py-3 pr-10 rounded-2xl text-lg font-medium cursor-pointer focus:outline-none"
                style={{
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--card-foreground))',
                }}
              >
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {!hideConfirm && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => onSelect(year, month, day)}
          className="px-12 py-3 text-base font-medium rounded-full hover:opacity-90 transition-all duration-300"
          style={{
            background: 'hsl(var(--foreground))',
            color: 'hsl(var(--background))',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {t('confirm')}
        </motion.button>
      )}
    </div>
  );
}
