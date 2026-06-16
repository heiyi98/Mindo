"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export type Gender = 'M' | 'F' | null;

interface GenderPickerProps {
  onSelect: (gender: Gender) => void;
  disabled?: boolean;
}

export default function GenderPicker({ onSelect, disabled = false }: GenderPickerProps) {
  const t = useTranslations('onboarding.genderPicker');
  const [selected, setSelected] = useState<Gender>(null);

  const handleSelect = (gender: Gender) => {
    setSelected(gender);
  };

  const handleConfirm = () => {
    onSelect(selected);
  };

  return (
    <div className="text-center max-w-md mx-auto w-full">
      <motion.h2
        className="text-2xl md:text-3xl font-light mb-3"
        style={{ color: 'hsl(var(--foreground))' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {t('title')}
      </motion.h2>

      <motion.p
        className="text-sm mb-2"
        style={{ color: 'hsl(var(--muted-foreground))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {t('description')}
      </motion.p>

      <motion.p
        className="text-xs mb-10"
        style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.6 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.15 }}
      >
        {t('subdescription')}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3 mb-10"
      >
        {(['M', 'F'] as Gender[]).map((gender) => {
          const key = gender === 'M' ? 'male' : 'female';
          const isSelected = selected === gender;
          return (
            <button
              key={key}
              onClick={() => handleSelect(gender)}
              className="w-full py-4 rounded-2xl text-base font-medium transition-all duration-200"
              style={{
                background: isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--card))',
                color: isSelected ? 'hsl(var(--background))' : 'hsl(var(--foreground))',
                border: `1px solid ${isSelected ? 'hsl(var(--foreground))' : 'hsl(var(--border))'}`,
              }}
            >
              {t(key)}
            </button>
          );
        })}
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={handleConfirm}
        disabled={disabled}
        className="w-full px-12 py-4 text-base font-medium rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'hsl(var(--foreground))',
          color: 'hsl(var(--background))',
        }}
      >
        {selected !== null ? t('next') : t('skip')}
      </motion.button>
    </div>
  );
}
