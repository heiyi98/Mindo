'use client';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Celebrity {
  id: string;
  name: string;
  portrait_url: string | null;
}

interface CelebrityCarouselProps {
  celebrities: Celebrity[];
  title: string;
}

export default function CelebrityCarousel({ celebrities, title }: CelebrityCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (celebrities.length === 0) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current.offsetLeft || 0);
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="w-full"
    >
      <p
        className="text-center text-xs font-light tracking-[0.3em] mb-8 uppercase"
        style={{ color: 'hsl(var(--foreground) / 0.4)' }}
      >
        {title}
      </p>

      <div className="relative">
        {/* 左渐隐 */}
        <div
          className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }}
        />
        {/* 右渐隐 */}
        <div
          className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }}
        />

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {celebrities.map((celebrity) => (
            <div
              key={celebrity.id}
              className="flex flex-col items-center gap-3 shrink-0"
              style={{ width: 80 }}
            >
              <div
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: 'hsl(var(--muted))' }}
              >
                {celebrity.portrait_url ? (
                  <img
                    src={celebrity.portrait_url}
                    alt={celebrity.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-2xl"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    ?
                  </div>
                )}
              </div>
              <p
                className="text-xs text-center leading-tight line-clamp-2"
                style={{ color: 'hsl(var(--foreground) / 0.8)' }}
              >
                {celebrity.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
