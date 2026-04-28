'use client';
import { useEffect, useRef } from 'react';

interface ParticleBackgroundProps {
  color: string;
}

export default function ParticleBackground({ color }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      if (!canvas.parentElement) return;
      const w = canvas.parentElement.offsetWidth;
      const h = canvas.parentElement.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', resize);
    resize();

    const particles = Array.from({ length: 200 }, () => ({
      x: Math.random() * (canvas.parentElement?.offsetWidth || window.innerWidth),
      y: Math.random() * (canvas.parentElement?.offsetHeight || window.innerHeight),
      vy: Math.random() * -1.2 - 0.3,
      size: Math.random() * 1.5 + 3.0,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      if (!canvas.parentElement) return;
      const w = canvas.parentElement.offsetWidth;
      const h = canvas.parentElement.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.y += p.vy;
        p.phase += p.pulseSpeed;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        ctx.globalAlpha = ((Math.sin(p.phase) + 1) / 2) * 0.4 + 0.05;
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: 'plus-lighter', zIndex: 0 }}
    />
  );
}
