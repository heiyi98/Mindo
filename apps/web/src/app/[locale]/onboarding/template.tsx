'use client';
import { useEffect, useState } from 'react';

// Next.js 约定文件名：template.tsx 在每次进入这个路由段时都会重新挂载
// （不像 layout.tsx 那样跨导航保持不变），所以适合用来做"刚进入这个页面"的渐入动画。
export default function OnboardingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setVisible(true);
      return;
    }
    // 双 rAF：确保浏览器先画出 opacity:0 这一帧，再触发到 1 的过渡，
    // 否则两次状态变化可能被合并到同一帧，过渡直接跳过不播放。
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {children}
    </div>
  );
}