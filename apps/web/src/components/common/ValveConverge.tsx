'use client';
import { useEffect, useState } from 'react';
import { ValveLogo } from './ValveLogo';

interface ValveConvergeProps {
  /** 容器尺寸，默认跟落地页 LandingContent.tsx 里的 LOGO_SIZE 一致 */
  size?: string;
  /** 默认跟落地页 LOGO_STROKE_WIDTH 对齐（都是7） */
  strokeWidth?: number;
  /** 轨道长度。默认24000匹配 ValveLogo 自身默认值，适合大尺寸、需要
      甩出任意宽度屏幕的场景（比如这次新增的 onboarding 入场展开）。
      小尺寸固定展示的场景（比如 teaser 的闭合汇合）要显式传短值，
      否则"线收回"这个动作会因为可见占比太小而看不出移动过程。 */
  railEnd?: number;
  /** 'close'：挂载时"空"（线在轨道外），触发后线收回+逆时针复位，变成完整logo。
      'open'：挂载时"实"（完整logo），触发后顺时针旋转+线抽出，变成"空"——
      跟落地页原本那套展开动画完全一致，只是现在挪到这个组件里复用。 */
  direction?: 'open' | 'close';
  /** 动画真正结束时触发（基于 transitionend，不是估时） */
  onComplete?: () => void;
  className?: string;
}

export function ValveConverge({
  size = 'clamp(22rem, 75vh, 46rem)',
  strokeWidth = 7,
  railEnd = 24000,
  direction = 'close',
  onComplete,
  className,
}: ValveConvergeProps) {
  // close: 挂载时 isOpen=true（对应"空"），触发后变 false（收回/复位）
  // open : 挂载时 isOpen=false（对应"实"/完整logo），触发后变 true（展开/抽出）
  const [open, setOpen] = useState(direction === 'close');

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(direction === 'close' ? false : true);
    }, 100);
    return () => clearTimeout(timer);
  }, [direction]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        color: 'hsl(var(--foreground))',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <ValveLogo side="left" isOpen={open} strokeWidth={strokeWidth} railEnd={railEnd} />
      </div>
      <div style={{ position: 'absolute', inset: 0 }}>
        <ValveLogo
          side="right"
          isOpen={open}
          strokeWidth={strokeWidth}
          railEnd={railEnd}
          onOpenComplete={direction === 'open' ? onComplete : undefined}
          onCloseComplete={direction === 'close' ? onComplete : undefined}
        />
      </div>
    </div>
  );
}