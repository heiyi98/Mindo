import type { Wuxing, YinYang } from '../types';

// 十干配脏腑（子午流注标准配属，阳干配腑，阴干配脏）：
// 甲→胆 乙→肝 丙→小肠 丁→心 戊→胃 己→脾 庚→大肠 辛→肺 壬→膀胱 癸→肾
export const ORGAN_MAP: Record<YinYang, Record<Wuxing, string>> = {
  Yang: { Wood: '胆', Fire: '小肠', Earth: '胃', Metal: '大肠', Water: '膀胱' },
  Yin: { Wood: '肝', Fire: '心', Earth: '脾', Metal: '肺', Water: '肾' },
};
