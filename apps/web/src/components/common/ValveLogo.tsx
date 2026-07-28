'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type TransitionEvent } from 'react';

// 唯我独尊 logo —— 阀门动画版，单侧渲染
function buildPaths(railEnd: number) {
  return {
    left: `M 453.6407865 586.2255741 A 94.427191 94.427191 0 0 1 453.6407865 437.7744259 A 152.7864045 152.7864045 0 0 0 512 317.6526784 L 512 112 A 400 400 0 0 0 264.7864045 826.4605511 A 400 400 0 0 0 512 912 L 512 ${railEnd}`,
    right: `M 570.3592135 437.7744259 A 94.427191 94.427191 0 0 1 570.3592135 586.2255741 A 152.7864045 152.7864045 0 0 0 512 706.3473216 L 512 912 A 400 400 0 0 0 759.2135955 197.5394489 A 400 400 0 0 0 512 112 L 512 -${railEnd}`,
  };
}

function buildExts(railEnd: number) {
  return {
    left: `M 264.7864045 826.4605511 A 400 400 0 0 0 512 912 L 512 ${railEnd}`,
    right: `M 759.2135955 197.5394489 A 400 400 0 0 0 512 112 L 512 -${railEnd}`,
  };
}

const DASH_GAP = 50000;

type Side = 'left' | 'right';

function getPathLength(d: string): number {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  return p.getTotalLength();
}

interface ValveLogoProps {
  side: Side;
  isOpen: boolean;
  onOpenComplete?: () => void;
  onCloseComplete?: () => void;
  strokeWidth?: number;
  railEnd?: number;
  className?: string;
  style?: CSSProperties;
}

export function ValveLogo({
  side,
  isOpen,
  onOpenComplete,
  onCloseComplete,
  strokeWidth = 6,
  railEnd = 24000,
  className,
  style,
}: ValveLogoProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const d = buildPaths(railEnd)[side];
  const extD = buildExts(railEnd)[side];

  useLayoutEffect(() => {
    if (!pathRef.current) return;
    const extLen = getPathLength(extD);
    const logoLen = pathRef.current.getTotalLength() - extLen;
    // 【核心修复】：必须注入 px，否则在 CSS calc 中毫无作用
    pathRef.current.style.setProperty('--ext-len', `${extLen}px`);
    pathRef.current.style.setProperty('--logo-len', `${logoLen}px`);
  }, [side, railEnd, extD]);

  useEffect(() => {
    if (!isOpen || !pathRef.current) return;
    const node = pathRef.current;
    const handleEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'stroke-dashoffset') {
        onOpenComplete?.();
      }
    };
    node.addEventListener('transitionend', handleEnd as any);
    return () => node.removeEventListener('transitionend', handleEnd as any);
  }, [isOpen, onOpenComplete]);

  const handleRotateTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform') return;
    if (!isOpen) {
      onCloseComplete?.();
    }
  };

  // 恢复落地页原版动画曲线
  const rotateTransition = reducedMotion
    ? 'transform 0.01s linear'
    : isOpen
      ? 'transform 0.8s cubic-bezier(0.8, 0, 0.2, 1) 0s'
      : 'transform 0.8s cubic-bezier(0.8, 0, 0.2, 1) 1s'; // 倒放时，等线收完(1s)再转

  const dashTransition = reducedMotion
    ? 'stroke-dashoffset 0.01s linear'
    : isOpen
      ? 'stroke-dashoffset 1s cubic-bezier(0.7, 0, 0.1, 1) 0.8s'
      : 'stroke-dashoffset 1s cubic-bezier(0.7, 0, 0.1, 1) 0s'; // 倒放时，线先收回

  return (
    <div
      className={className}
      onTransitionEnd={handleRotateTransitionEnd}
      style={{
        width: '100%',
        height: '100%',
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: rotateTransition,
        ...style,
      }}
    >
      <svg viewBox="0 0 1024 1024" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: `var(--logo-len, 1500px) ${DASH_GAP}`,
            // 使用 px 确保 calc 生效
            strokeDashoffset: isOpen ? 'calc(-1 * var(--ext-len, 24000px))' : 0,
            transition: dashTransition,
          }}
        />
      </svg>
    </div>
  );
}