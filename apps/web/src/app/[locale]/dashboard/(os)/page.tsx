'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext, DragEndEvent, DragMoveEvent, DragOverEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCenter,
  useDraggable, useDroppable,
} from '@dnd-kit/core';
import { X, Plus } from 'lucide-react';
import { useTopBar } from '@/components/os/TopBarContext';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';

import BaziChartCard from '@/components/modules/bazi/BaziChartCard';
import WuxingRadarCard from '@/components/modules/bazi/WuxingRadarCard';
import DayMasterCard from '@/components/modules/bazi/DayMasterCard';
import BaziReadingCard from '@/components/modules/bazi/BaziReadingCard';
import ProfileCard from '@/components/common/ProfileCard';
import BigFiveChart from '@/components/modules/bigfive/BigFiveChart';
import StarChartWheel from '@/components/modules/western/StarChartWheel';

import { WIDGET_REGISTRY, DEFAULT_LAYOUT, repackLayout } from '@/config/dashboard-widgets';
import type { LayoutItem } from '@/config/dashboard-widgets';

function renderCard(id: string, profileId: string) {
  switch (id) {
    case 'profile-card':  return <ProfileCard profileId={profileId} />;
    case 'bazi-chart':    return <BaziChartCard profileId={profileId} />;
    case 'wuxing-radar':  return <WuxingRadarCard profileId={profileId} />;
    case 'day-master':    return <DayMasterCard profileId={profileId} />;
    case 'bazi-reading':  return <BaziReadingCard profileId={profileId} />;
    case 'bigfive-radar': return <BigFiveChart profileId={profileId} />;
    case 'western-chart': return <StarChartWheel profileId={profileId} />;
    default: return null;
  }
}

function DroppableCell({ col, row }: {
  col: number;
  row: number;
}) {
  const { setNodeRef } = useDroppable({ id: `cell-${col}-${row}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        gridColumn: col,
        gridRow: row,
      }}
    />
  );
}

function DraggableCard({
  item, cellSize, isEditMode, isMobile, onDelete, children,
}: {
  item: LayoutItem;
  cellSize: number;
  isEditMode: boolean;
  isMobile: boolean;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: !isEditMode,
  });

  const gap = 16;
  const w = cellSize * item.colSpan + gap * (item.colSpan - 1);
  const h = cellSize * item.rowSpan + gap * (item.rowSpan - 1);

  const style: React.CSSProperties = {
    gridColumn: isMobile ? '1 / -1' : `${item.col} / span ${item.colSpan}`,
    gridRow: isMobile ? 'auto' : `${item.row} / span ${item.rowSpan}`,
    width: isMobile ? '100%' : w,
    height: isMobile ? 'auto' : h,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isEditMode ? 20 : 10,
    cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
    touchAction: isEditMode ? 'none' : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...(isEditMode ? { ...attributes, ...listeners } : {})}>
      <div className="w-full h-full">
        {children ?? (
          <div className="w-full h-full min-h-[250px] bg-card rounded-2xl border border-dashed border-border flex items-center justify-center p-4">
            <span className="text-sm text-muted-foreground">({item.id})</span>
          </div>
        )}
      </div>
      {isEditMode && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(item.id); }}
          style={{
            position: 'absolute', top: -8, right: -8,
            width: 24, height: 24, borderRadius: '50%',
            background: '#e53e3e', color: '#fff',
            border: '2px solid hsl(var(--background))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 40,
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          }}
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { setContent } = useTopBar();
  const { currentProfile } = useCurrentProfile();

  const [layout, setLayout]         = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dragItem, setDragItem]     = useState<LayoutItem | null>(null);
  const [hoverCell, setHoverCell]   = useState<{ col: number; row: number } | null>(null);
  const [isMobile, setIsMobile]     = useState(false);
  const [cellSize, setCellSize]     = useState(120);
  const containerRef  = useRef<HTMLDivElement>(null);
  const dragItemRef   = useRef<LayoutItem | null>(null);
  const hoverCellRef  = useRef<{ col: number; row: number } | null>(null);
  const dragOffsetRef = useRef<{ colOffset: number; rowOffset: number }>({ colOffset: 0, rowOffset: 0 });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCellSize(Math.floor((entry.contentRect.width - 5 * 16) / 6));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fetch('/api/dashboard/layout')
      .then(r => r.json())
      .then(({ layout: saved }) => {
        if (Array.isArray(saved) && saved.length > 0) {
          setLayout(saved.filter(i => i.id !== 'daymaster'));
        }
      })
      .catch(() => {});
  }, []);

  const saveLayout = useCallback((l: LayoutItem[]) => {
    fetch('/api/dashboard/layout', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: l }),
    }).catch(() => {});
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    saveLayout(layout);
  }, [layout, saveLayout]);

  useEffect(() => {
    setContent({
      left: <ProfileSwitcher />,
      right: (
        <button
          onClick={isEditMode ? exitEditMode : () => setIsEditMode(true)}
          className="text-xs font-light px-3 py-1 rounded-lg transition-colors"
          style={{
            background: isEditMode ? 'hsl(var(--foreground))' : 'hsl(var(--muted))',
            color: isEditMode ? 'hsl(var(--background))' : 'hsl(var(--foreground))',
          }}
        >
          {isEditMode ? t('done') : t('edit')}
        </button>
      ),
    });
    return () => setContent({});
  }, [setContent, isEditMode, t, exitEditMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Pre-compute cell grid dimensions; always render cells in edit mode so
  // they are measured by dnd-kit before the first drag starts.
  const maxRow     = layout.reduce((max, item) => Math.max(max, item.row + item.rowSpan - 1), 3);
  const numCellRows = isEditMode ? maxRow + 2 : 0;

  const handleDragStart = ({ active, activatorEvent }: { active: { id: string | number }; activatorEvent: Event }) => {
    const item = layout.find(i => i.id === String(active.id)) ?? null;
    dragItemRef.current = item;
    setDragItem(item);
    if (item && activatorEvent instanceof PointerEvent && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const gap = 16;
      const mouseCol = Math.floor((activatorEvent.clientX - containerRect.left) / (cellSize + gap));
      const mouseRow = Math.floor((activatorEvent.clientY - containerRect.top) / (cellSize + gap));
      const colOffset = mouseCol - (item.col - 1);
      const rowOffset = mouseRow - (item.row - 1);
      dragOffsetRef.current = {
        colOffset: Math.max(0, Math.min(colOffset, item.colSpan - 1)),
        rowOffset: Math.max(0, Math.min(rowOffset, item.rowSpan - 1)),
      };
    } else {
      dragOffsetRef.current = { colOffset: 0, rowOffset: 0 };
    }
  };

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!dragItemRef.current || !containerRef.current) return;
    const activator = event.activatorEvent as PointerEvent;
    const containerRect = containerRef.current.getBoundingClientRect();
    const gap = 16;
    const step = cellSize + gap;
    // 当前鼠标位置 = 按下时位置 + 拖动偏移
    const currentX = activator.clientX + event.delta.x - containerRect.left;
    const currentY = activator.clientY + event.delta.y - containerRect.top;
    // 鼠标所在格子
    const mouseCol = Math.floor(currentX / step) + 1;
    const mouseRow = Math.floor(currentY / step) + 1;
    // 减去鼠标在卡片内的偏移，得到卡片左上角格子
    const rawCol = mouseCol - dragOffsetRef.current.colOffset;
    const rawRow = mouseRow - dragOffsetRef.current.rowOffset;
    const col = Math.max(1, Math.min(rawCol, 7 - dragItemRef.current.colSpan));
    const row = Math.max(1, rawRow);
    if (hoverCellRef.current?.col !== col || hoverCellRef.current?.row !== row) {
      hoverCellRef.current = { col, row };
      setHoverCell({ col, row });
    }
  }, [cellSize]);

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) {
      hoverCellRef.current = null;
      setHoverCell(null);
    }
  };

  const handleDragEnd = ({ active }: DragEndEvent) => {
    const di = dragItemRef.current;
    const hc = hoverCellRef.current;
    dragItemRef.current = null;
    hoverCellRef.current = null;
    setDragItem(null);
    setHoverCell(null);
    if (di && hc) {
      setLayout(prev => {
        const activeId = String(active.id);
        const moved = { ...di, col: hc.col, row: hc.row };
        const others = prev.filter(item => item.id !== activeId);

        // 检测冲突并把冲突的卡片往下推
        // 检测两张卡片是否重叠
        const overlaps = (a: LayoutItem, b: LayoutItem) => {
          const colOk = a.col < b.col + b.colSpan && a.col + a.colSpan > b.col;
          const rowOk = a.row < b.row + b.rowSpan && a.row + a.rowSpan > b.row;
          return colOk && rowOk;
        };

        // 为一张卡片找最近的空位（从左上角开始扫描）
        const findEmptySlot = (
          item: LayoutItem,
          placed: LayoutItem[]
        ): { col: number; row: number } => {
          for (let row = 1; row < 100; row++) {
            for (let col = 1; col <= 7 - item.colSpan; col++) {
              const candidate = { ...item, col, row };
              const conflict = placed.some(p => overlaps(candidate, p));
              if (!conflict) return { col, row };
            }
          }
          return { col: 1, row: 1 };
        };

        const resolveConflicts = (items: typeof others, incoming: typeof moved): typeof others => {
          // placed从incoming开始，逐步加入已解决的卡片
          const placed: LayoutItem[] = [incoming];
          // 按左上角优先排序（row小优先，row相同则col小优先）
          const sorted = [...items].sort((a, b) =>
            a.row !== b.row ? a.row - b.row : a.col - b.col
          );
          const result: typeof others = [];
          for (const item of sorted) {
            const hasConflict = placed.some(p => overlaps(item, p));
            if (hasConflict) {
              const slot = findEmptySlot(item, placed);
              const resolved = { ...item, col: slot.col, row: slot.row };
              placed.push(resolved);
              result.push(resolved);
            } else {
              placed.push(item);
              result.push(item);
            }
          }
          return result;
        };

        const resolved = resolveConflicts(others, moved);
        const next = [moved, ...resolved];
        saveLayout(next);
        return next;
      });
    }
  };

  const handleDragCancel = () => {
    dragItemRef.current = null;
    hoverCellRef.current = null;
    setDragItem(null);
    setHoverCell(null);
  };

  const handleDelete = useCallback((id: string) =>
    setLayout(prev => prev.filter(i => i.id !== id)), []);

  const handleAdd = useCallback((def: typeof WIDGET_REGISTRY[0]) => {
    setLayout(prev => {
      if (prev.some(i => i.id === def.id)) return prev;
      const newItem: LayoutItem = {
        id: def.id, col: 1, row: 1,
        colSpan: def.defaultColSpan,
        rowSpan: def.defaultRowSpan,
      };
      // 找最近空位
      for (let row = 1; row < 100; row++) {
        for (let col = 1; col <= 7 - newItem.colSpan; col++) {
          const candidate = { ...newItem, col, row };
          const conflict = prev.some(p => {
            const colOk = candidate.col < p.col + p.colSpan && candidate.col + candidate.colSpan > p.col;
            const rowOk = candidate.row < p.row + p.rowSpan && candidate.row + candidate.rowSpan > p.row;
            return colOk && rowOk;
          });
          if (!conflict) {
            return [...prev, { ...newItem, col, row }];
          }
        }
      }
      return [...prev, newItem];
    });
  }, []);

  return (
    <>
      {isEditMode && <div className="fixed inset-0 z-10" onClick={exitEditMode} />}

      <div
        className="relative w-full max-w-5xl mx-auto px-6 py-6"
        style={{ paddingRight: isEditMode ? `${64 + 264}px` : undefined }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div
            ref={containerRef}
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(6, 1fr)',
              gridAutoRows: isMobile ? 'auto' : `${cellSize}px`,
              gap: '16px',
              width: '100%',
            }}
          >
            {/* Droppable cell layer — rendered behind cards, only in edit mode on desktop */}
            {!isMobile && Array.from({ length: numCellRows * 6 }, (_, i) => {
              const col = (i % 6) + 1;
              const row = Math.floor(i / 6) + 1;
              return (
                <DroppableCell key={`cell-${col}-${row}`} col={col} row={row} />
              );
            })}

            {/* 整块高亮覆盖层：高于卡片层，低于DragOverlay */}
            {!isMobile && hoverCell && dragItem && (
              <div
                style={{
                  gridColumn: `${hoverCell.col} / span ${dragItem.colSpan}`,
                  gridRow: `${hoverCell.row} / span ${dragItem.rowSpan}`,
                  borderRadius: '16px',
                  background: 'hsl(var(--foreground) / 0.06)',
                  border: '2px dashed hsl(var(--foreground) / 0.2)',
                  pointerEvents: 'none',
                  position: 'relative',
                  zIndex: 30,
                }}
              />
            )}

            {/* Card layer */}
            {layout.map(item => (
              <DraggableCard
                key={item.id}
                item={item}
                cellSize={cellSize}
                isEditMode={isEditMode}
                isMobile={isMobile}
                onDelete={handleDelete}
              >
                {renderCard(item.id, currentProfile?.id ?? '')}
              </DraggableCard>
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {dragItem && (
              <div
                style={{
                  width: cellSize * dragItem.colSpan + 16 * (dragItem.colSpan - 1),
                  height: cellSize * dragItem.rowSpan + 16 * (dragItem.rowSpan - 1),
                  borderRadius: '16px',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  opacity: 0.9,
                }}
              >
                {renderCard(dragItem.id, currentProfile?.id ?? '')}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {isEditMode && (
          <div
            onClick={e => e.stopPropagation()}
            className="fixed top-12 right-0 bottom-0 w-64 overflow-y-auto z-40 p-4"
            style={{ background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}
          >
            <p className="text-xs font-light tracking-[0.2em] uppercase mb-4"
              style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}>
              {t('widgetDrawer.title')}
            </p>
            <div className="flex flex-col gap-2">
              {WIDGET_REGISTRY.map(def => {
                const inLayout = layout.some(i => i.id === def.id);
                return (
                  <button
                    key={def.id}
                    onClick={() => !inLayout && handleAdd(def)}
                    disabled={inLayout}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-light text-left disabled:opacity-40 transition-opacity"
                    style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
                  >
                    <span>{t(`widgetNames.${def.id}` as any)}</span>
                    {inLayout ? (
                      <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {t('widgetDrawer.added')}
                      </span>
                    ) : (
                      <Plus size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}