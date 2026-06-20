export type LayoutItem = {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
};

// 注册表：从卡片自身的CARD_META读取尺寸规格
export const WIDGET_REGISTRY = [
  { id: 'profile-card',  defaultColSpan: 2, defaultRowSpan: 1 },
  { id: 'bazi-chart',    defaultColSpan: 4, defaultRowSpan: 2 },
  { id: 'wuxing-radar',  defaultColSpan: 2, defaultRowSpan: 2 },
  { id: 'day-master',    defaultColSpan: 2, defaultRowSpan: 3 },
  { id: 'bazi-reading',  defaultColSpan: 1, defaultRowSpan: 2 },
  { id: 'bigfive-radar', defaultColSpan: 2, defaultRowSpan: 2 },
  { id: 'western-chart', defaultColSpan: 2, defaultRowSpan: 2 },
];

// 默认布局
export const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: 'profile-card',  col: 1, row: 1, colSpan: 2, rowSpan: 1 },
  { id: 'bazi-chart',    col: 1, row: 2, colSpan: 4, rowSpan: 2 },
  { id: 'wuxing-radar',  col: 5, row: 2, colSpan: 2, rowSpan: 2 },
];

const COLS = 6;

export function repackLayout(items: LayoutItem[]): LayoutItem[] {
  const occ = new Set<string>();

  const canFit = (r: number, c: number, cs: number, rs: number) => {
    if (c + cs - 1 > COLS) return false;
    for (let dr = 0; dr < rs; dr++)
      for (let dc = 0; dc < cs; dc++)
        if (occ.has(`${r + dr},${c + dc}`)) return false;
    return true;
  };

  const occupy = (r: number, c: number, cs: number, rs: number) => {
    for (let dr = 0; dr < rs; dr++)
      for (let dc = 0; dc < cs; dc++)
        occ.add(`${r + dr},${c + dc}`);
  };

  return items.map(item => {
    for (let row = 1; row < 100; row++) {
      for (let col = 1; col <= COLS; col++) {
        if (canFit(row, col, item.colSpan, item.rowSpan)) {
          occupy(row, col, item.colSpan, item.rowSpan);
          return { ...item, row, col };
        }
      }
    }
    return item;
  });
}