import { engine } from './engine';
import { generateDestinyTimeline } from './timeline';

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
