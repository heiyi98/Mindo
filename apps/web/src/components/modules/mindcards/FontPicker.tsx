'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Type } from 'lucide-react';
import { MIND_FONT_CATALOG, resolveFontFamily } from '@/lib/mindCards/fontCatalog';
import type { LangGroupKey } from '@/lib/mindCards/style';
import BottomSheetPopover from './BottomSheetPopover';

export interface FontPickerSelection {
  groupKey: LangGroupKey;
  technicalName: string;
  // 仅sc/tc/jp的字体选项才带这个：完整关联顺序（含自己），由该选项在fontCatalog里
  // 独立写死的relatedChain直接传出，交给上层去存
  relatedChain?: string[];
}

interface FontPickerProps {
  // 五个语言分组各自当前应显示为选中的字体，永远是完整的5项（未手动选过的语言
  // 也会有值，落在对应的衬线默认字体上——面板不区分"默认"和"选中"两种视觉状态）
  value: Partial<Record<LangGroupKey, string>>;
  onChange: (selection: FontPickerSelection) => void;
}

type LoadState = 'idle' | 'loading' | 'loaded';

const APPROACH_TARGET = 92;
const APPROACH_DURATION_MS = 1400;
const FINISH_DURATION_MS = 150;

function FontProgressBar({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'hsl(var(--foreground) / 0.12)',
          transform: `translateX(${progress}%)`,
          transition: `transform ${progress >= 100 ? FINISH_DURATION_MS : APPROACH_DURATION_MS}ms ${progress >= 100 ? 'ease-out' : 'cubic-bezier(0.1, 0.7, 0.1, 1)'}`,
        }}
      />
    </div>
  );
}

export default function FontPicker({ value, onChange }: FontPickerProps) {
  const t = useTranslations('mindcards');
  const [open, setOpen] = useState(false);
  const [loadStates, setLoadStates] = useState<Record<string, LoadState>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});

  const triggerFontLoad = (technicalName: string) => {
    if (!technicalName || loadStates[technicalName] === 'loaded') return;

    const family = resolveFontFamily(technicalName)!;
    if (typeof document === 'undefined' || !('fonts' in document)) return;

    if (document.fonts.check(`16px ${family}`)) {
      setLoadStates((prev) => ({ ...prev, [technicalName]: 'loaded' }));
      return;
    }

    setLoadStates((prev) => ({ ...prev, [technicalName]: 'loading' }));
    setProgress((prev) => ({ ...prev, [technicalName]: 0 }));
    requestAnimationFrame(() => {
      setProgress((prev) => ({ ...prev, [technicalName]: APPROACH_TARGET }));
    });

    document.fonts.load(`16px ${family}`).then(() => {
      setProgress((prev) => ({ ...prev, [technicalName]: 100 }));
      setTimeout(() => {
        setLoadStates((prev) => ({ ...prev, [technicalName]: 'loaded' }));
      }, FINISH_DURATION_MS);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('composer.toolbar.font')}
        title={t('composer.toolbar.font')}
        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
        style={{ color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
      >
        <Type size={14} />
      </button>

      <BottomSheetPopover open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {MIND_FONT_CATALOG.map((group) => (
            <div key={group.groupKey}>
              {group.groupLabel && (
                <div className="text-xs mb-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {group.groupLabel}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const selected = value[group.groupKey] === option.technicalName;
                  const state = loadStates[option.technicalName] ?? 'idle';
                  return (
                    <button
                      key={option.technicalName}
                      type="button"
                      onClick={() => {
                        onChange({ groupKey: group.groupKey, technicalName: option.technicalName, relatedChain: option.relatedChain });
                        triggerFontLoad(option.technicalName);
                      }}
                      className="relative text-sm px-3 py-2 rounded-xl overflow-hidden"
                      style={{
                        color: 'hsl(var(--foreground))',
                        background: selected ? 'hsl(var(--foreground) / 0.1)' : 'hsl(var(--background))',
                        border: selected ? '1px solid hsl(var(--foreground) / 0.3)' : '1px solid hsl(var(--border))',
                        fontFamily: resolveFontFamily(option.technicalName),
                      }}
                    >
                      {state === 'loading' && <FontProgressBar progress={progress[option.technicalName] ?? 0} />}
                      <span className="relative">{option.displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </BottomSheetPopover>
    </>
  );
}