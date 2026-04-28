'use client';
import { motion } from 'framer-motion';

export default function Divider({ delay = 0.5 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay, duration: 1.2, ease: 'easeInOut' }}
      className="w-full max-w-sm mx-auto my-16 md:my-20"
      style={{
        height: 1,
        background: 'linear-gradient(to right, transparent, hsl(var(--foreground) / 0.1), transparent)'
      }}
    />
  );
}
