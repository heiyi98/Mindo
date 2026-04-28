// packages/core/src/pro-engine.ts
// 专业模式入口：面向命理专业人士，返回完整原始数据

import { engine } from './engine';
import { generateDestinyTimeline } from './destiny-timeline';

export const proEngine = {
  calculate: (
    dateStr: string,
    gender: 'M' | 'F',
    targetDate: { y: number; m: number; d: number },
    coords?: { lat: number; lng: number }
  ) => {
    const lat = coords?.lat ?? 39.9042;
    const lng = coords?.lng ?? 116.4074;

    const baseChart = engine.calculate({
      dateStr,
      lat,
      lng,
      timeUnknown: false
    });

    const timeline = generateDestinyTimeline(dateStr, gender, targetDate.y);

    return {
      natal: baseChart,
      destinyTimeline: timeline
    };
  }
};
