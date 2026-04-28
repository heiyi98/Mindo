'use client';
import { motion } from 'framer-motion';

interface DayMasterCardProps {
  stemId: string;
  name: string;
  imagery: string;
  intro: string;
  tags: string[];
  accentColor: string;
  accentBg: string;
}

export default function DayMasterCard({
  stemId, name, imagery, intro, tags, accentColor, accentBg
}: DayMasterCardProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[180px] md:max-w-[220px] aspect-[1/1.5] mb-10 relative flex items-center justify-center"
      >
        <img
          src={`/images/archetypes/${stemId}.png`}
          alt={name}
          className="w-full h-full object-contain drop-shadow-xl"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="space-y-4 w-full px-4"
      >
        <h2
          className="text-4xl md:text-5xl font-light tracking-widest"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <span style={{ color: accentColor }}>{name}</span>
        </h2>

        <p
          className="text-sm md:text-base font-medium tracking-[0.2em]"
          style={{ color: accentColor }}
        >
          {imagery}
        </p>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 1 }}
        className="text-lg md:text-xl leading-loose font-light tracking-wide max-w-lg px-6 mt-10"
        style={{ color: 'hsl(var(--foreground) / 0.9)' }}
      >
        {intro}
      </motion.p>

      {tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="w-full max-w-md px-4 mt-12"
        >
          <div className="grid grid-cols-2 gap-4">
            {tags.map((tag, idx) => {
              const isPositive = idx < 2;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{
                    background: isPositive ? accentBg : 'hsl(var(--muted) / 0.3)',
                    border: `1px solid ${isPositive ? accentColor + '33' : 'hsl(var(--border) / 0.5)'}`,
                  }}
                >
                  <span
                    className="text-sm tracking-widest font-light"
                    style={{ color: isPositive ? accentColor : 'hsl(var(--muted-foreground) / 0.7)' }}
                  >
                    {tag}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
