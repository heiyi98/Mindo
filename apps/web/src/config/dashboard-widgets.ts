export interface LayoutItem {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface WidgetDef {
  id: string;
  defaultColSpan: number;
  defaultRowSpan: number;
  component: string;
  requiresModule: 'bazi' | 'bigfive' | 'western' | null;
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  { id: 'profile-card',  defaultColSpan: 2, defaultRowSpan: 1, component: 'ProfileCardWidget',  requiresModule: null },
  { id: 'bazi-chart',    defaultColSpan: 4, defaultRowSpan: 2, component: 'BaziChartWidget',    requiresModule: 'bazi' },
  { id: 'wuxing-radar',  defaultColSpan: 2, defaultRowSpan: 2, component: 'WuxingRadarWidget',  requiresModule: 'bazi' },
  { id: 'daymaster',     defaultColSpan: 2, defaultRowSpan: 3, component: 'DayMasterWidget',    requiresModule: 'bazi' },
  { id: 'bigfive-radar', defaultColSpan: 4, defaultRowSpan: 4, component: 'BigFiveRadarWidget', requiresModule: 'bigfive' },
  { id: 'western-chart', defaultColSpan: 4, defaultRowSpan: 4, component: 'WesternChartWidget', requiresModule: 'western' },
];

export const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: 'profile-card',  col: 1, row: 1, colSpan: 2, rowSpan: 1 },
  { id: 'bazi-chart',    col: 1, row: 2, colSpan: 4, rowSpan: 2 },
  { id: 'wuxing-radar',  col: 1, row: 4, colSpan: 2, rowSpan: 2 },
  { id: 'daymaster',     col: 3, row: 4, colSpan: 2, rowSpan: 3 },
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
