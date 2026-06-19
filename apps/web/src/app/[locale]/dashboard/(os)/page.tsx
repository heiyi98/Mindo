'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus } from 'lucide-react';
import { useTopBar } from '@/components/os/TopBarContext';
import { useCurrentProfile } from '@/components/os/CurrentProfileContext';
import ProfileSwitcher from '@/components/dashboard/ProfileSwitcher';
import {
  ProfileCardWidget,
  BaziChartWidget,
  WuxingRadarWidget,
  DayMasterWidget,
  BigFiveRadarWidget,
  WesternChartWidget,
} from '@/components/dashboard/widgets';
import {
  WIDGET_REGISTRY,
  DEFAULT_LAYOUT,
  repackLayout,
} from '@/config/dashboard-widgets';
import type { LayoutItem } from '@/config/dashboard-widgets';

// ─── Widget renderer ────────────────────────────────────────────────────────

interface WidgetRenderProps {
  profileId: string;
  isEditMode: boolean;
  dashboardData?: Record<string, unknown>;
}

function renderWidget(id: string, props: WidgetRenderProps) {
  switch (id) {
    case 'profile-card':  return <ProfileCardWidget  {...props} />;
    case 'bazi-chart':    return <BaziChartWidget    {...props} />;
    case 'wuxing-radar':  return <WuxingRadarWidget  {...props} />;
    case 'daymaster':     return <DayMasterWidget    {...props} />;
    case 'bigfive-radar': return <BigFiveRadarWidget {...props} />;
    case 'western-chart': return <WesternChartWidget {...props} />;
    default:              return null;
  }
}

// ─── Sortable card wrapper ───────────────────────────────────────────────────

interface SortableCardProps {
  item: LayoutItem;
  cellSize: number;
  isEditMode: boolean;
  isMobile: boolean;
  onDelete: (id: string) => void;
  children: React.ReactNode;
}

function SortableCard({
  item, cellSize, isEditMode, isMobile, onDelete, children,
}: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !isEditMode });

  const minH = isMobile ? 120 : cellSize * item.rowSpan + 16 * (item.rowSpan - 1);

  const style: React.CSSProperties = {
    gridColumn: isMobile ? '1 / -1' : `${item.col} / span ${item.colSpan}`,
    gridRow:    isMobile ? 'auto'   : `${item.row} / span ${item.rowSpan}`,
    minHeight:  minH,
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    position:   'relative',
    zIndex:     isDragging ? 20 : 'auto',
    animation:  isEditMode ? 'dboard-shake 0.45s ease-in-out infinite' : undefined,
    cursor:     isEditMode ? 'grab' : 'default',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {isEditMode && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(item.id); }}
          className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: 'hsl(var(--destructive))', color: '#fff' }}
        >
          <X size={10} />
        </button>
      )}
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { setContent } = useTopBar();
  const { currentProfile } = useCurrentProfile();

  const [dashboardData, setDashboardData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [layout, setLayout]       = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [isMobile, setIsMobile]   = useState(false);
  const [cellSize, setCellSize]   = useState(100);

  const gridRef = useRef<HTMLDivElement>(null);

  // ── responsive ──────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── cell size from container ─────────────────────────────────────────────
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setCellSize(Math.floor((w - 5 * 16) / 6));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── load layout ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/dashboard/layout')
      .then(r => r.json())
      .then(({ layout: saved }) => {
        if (Array.isArray(saved) && saved.length > 0) setLayout(saved);
      })
      .catch(() => {});
  }, []);

  // ── load dashboard data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentProfile) return;
    setLoading(true);
    setDashboardData(null);
    fetch(`/api/dashboard?profile_id=${currentProfile.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setDashboardData(d);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [currentProfile?.id]);

  // ── save layout ──────────────────────────────────────────────────────────
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

  // ── TopBar injection ─────────────────────────────────────────────────────
  useEffect(() => {
    setContent({
      left: <ProfileSwitcher />,
      right: (
        <button
          onClick={isEditMode ? exitEditMode : () => setIsEditMode(true)}
          className="text-xs font-light px-3 py-1 rounded-lg transition-colors"
          style={{
            background: isEditMode
              ? 'hsl(var(--primary))'
              : 'hsl(var(--muted))',
            color: isEditMode
              ? 'hsl(var(--primary-foreground))'
              : 'hsl(var(--foreground))',
          }}
        >
          {isEditMode ? t('done') : t('edit')}
        </button>
      ),
    });
    return () => setContent({});
  }, [setContent, isEditMode, t, exitEditMode]);

  // ── dnd-kit sensors ─────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── drag handlers ────────────────────────────────────────────────────────
  const handleDragStart = ({ active }: { active: { id: string | number } }) => {
    setActiveId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    setLayout(prev => {
      const sorted = [...prev].sort(
        (a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col
      );
      const oldIdx = sorted.findIndex(i => i.id === active.id);
      const newIdx = sorted.findIndex(i => i.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return repackLayout(arrayMove(sorted, oldIdx, newIdx));
    });
  };

  // ── widget management ────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    setLayout(prev => repackLayout(prev.filter(i => i.id !== id)));
  }, []);

  const handleAdd = useCallback((def: typeof WIDGET_REGISTRY[0]) => {
    setLayout(prev => {
      if (prev.some(i => i.id === def.id)) return prev;
      const newItem: LayoutItem = {
        id: def.id,
        col: 1, row: 1,
        colSpan: def.defaultColSpan,
        rowSpan: def.defaultRowSpan,
      };
      return repackLayout([...prev, newItem]);
    });
  }, []);

  // ── sorted items for SortableContext ─────────────────────────────────────
  const sortedLayout = [...layout].sort(
    (a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col
  );
  const sortedIds = sortedLayout.map(i => i.id);
  const activeItem = activeId ? layout.find(i => i.id === activeId) : null;

  // ── loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>{t('loadError')}</p>
      </div>
    );
  }

  const widgetProps: WidgetRenderProps = {
    profileId:     currentProfile?.id ?? '',
    isEditMode,
    dashboardData: dashboardData ?? undefined,
  };

  return (
    <>
      {/* keyframes injected once */}
      <style>{`
        @keyframes dboard-shake {
          0%, 100% { transform: rotate(0deg); }
          25%       { transform: rotate(-1.5deg); }
          75%       { transform: rotate(1.5deg); }
        }
      `}</style>

      {/* edit-mode overlay — click to close */}
      {isEditMode && (
        <div
          className="fixed inset-0 z-30"
          onClick={exitEditMode}
        />
      )}

      <div className="relative w-full px-4 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedIds} strategy={rectSortingStrategy}>
            <div
              ref={gridRef}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(6, 1fr)',
                gridAutoRows:        isMobile ? 'auto' : `${cellSize}px`,
                gap:                 '16px',
              }}
            >
              {sortedLayout.map(item => (
                <SortableCard
                  key={item.id}
                  item={item}
                  cellSize={cellSize}
                  isEditMode={isEditMode}
                  isMobile={isMobile}
                  onDelete={handleDelete}
                >
                  {renderWidget(item.id, widgetProps)}
                </SortableCard>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem && (
              <div
                className="rounded-2xl shadow-2xl opacity-80"
                style={{
                  width:   cellSize * activeItem.colSpan + 16 * (activeItem.colSpan - 1),
                  height:  cellSize * activeItem.rowSpan + 16 * (activeItem.rowSpan - 1),
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* widget drawer */}
        {isEditMode && (
          <div
            onClick={e => e.stopPropagation()}
            className="fixed top-12 right-0 bottom-0 w-72 overflow-y-auto z-40 p-4"
            style={{
              background: 'hsl(var(--card))',
              borderLeft: '1px solid hsl(var(--border))',
            }}
          >
            <p
              className="text-xs font-light tracking-[0.2em] uppercase mb-4"
              style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
            >
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
                    style={{
                      background: 'hsl(var(--muted))',
                      color:      'hsl(var(--foreground))',
                    }}
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
