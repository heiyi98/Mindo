'use client';
import { useEffect, useRef, useState, type TransitionEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ValveLogo } from '@/components/common/ValveLogo';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
];

function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const current = LANGS.find(l => l.code === locale);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          <path d="M2 12h20"/>
        </svg>
        {current?.label}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute top-full right-0 mt-2 w-40 rounded-2xl overflow-hidden shadow-2xl z-50"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            {LANGS.map(({ code, label }) => (
              <Link
                key={code}
                href="/"
                locale={code as any}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2.5 text-xs transition-colors hover:bg-muted/50"
                style={{
                  color: code === locale
                    ? 'hsl(var(--foreground))'
                    : 'hsl(var(--muted-foreground))',
                }}
              >
                {label}
                {code === locale && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'hsl(var(--foreground))' }}
                  />
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 一次性标记：写入后由 /onboarding 页面读取，页面一进来先播"logo展开
// (旋转+抽线)"这段入场动画，播完再显示正文。必须跟 onboarding/page.tsx
// 里的字符串完全一致。
const ONBOARDING_INTRO_FLAG_KEY = 'mindo-onboarding-intro';

const LOGO_SIZE = 'clamp(22rem, 75vh, 46rem)';
const LOGO_STROKE_WIDTH = 7;
const BLUR_PX = 10;

export function LandingContent() {
  const t = useTranslations('landing');
  const router = useRouter();

  // revealed: logo 从模糊 -> 清晰（点击开始后触发）。
  // 清晰这一步真正完成后立刻跳转，不在本页等待任何旋转/抽线动画——
  // 那部分动画整个挪到了 /onboarding 页面自己的入场序列里播，
  // 这样点击后可以立刻导航，动画在新页面加载的这段时间里播放，
  // 不会出现"动画播完、还要空等下一页加载"的空窗期。
  const [revealed, setRevealed] = useState(false);
  const navigatedRef = useRef(false);

  // 页面一加载就预取 /onboarding 的代码，避免用户点击"开始"那一刻
  // 才现场去下载/编译，这段网络延迟是导致跳转闪烁更可能的原因，
  // 比 React 自己的渲染顺序问题影响大得多。
  useEffect(() => {
    router.prefetch('/onboarding');
  }, [router]);

  const handleStart = () => {
    setRevealed(true);
  };

  const handleRevealTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'filter' || !revealed || navigatedRef.current) return;
    navigatedRef.current = true;
    try {
      sessionStorage.setItem(ONBOARDING_INTRO_FLAG_KEY, '1');
    } catch {}
    router.push('/onboarding');
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'hsl(var(--background))', userSelect: 'none' }}
    >
      {/* logo层：独立居中于整个视口，跟标题块脱钩。全程静止完整，
          不做旋转/抽线——那部分动画在 /onboarding 页面播 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div
          onTransitionEnd={handleRevealTransitionEnd}
          style={{
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            color: 'hsl(var(--foreground))',
            filter: revealed ? 'blur(0px)' : `blur(${BLUR_PX}px)`,
            transition: 'filter 0.6s ease',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              animation: revealed ? 'none' : 'valveBreathe 3s ease-in-out infinite',
            }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              <ValveLogo side="left" isOpen={false} strokeWidth={LOGO_STROKE_WIDTH} />
            </div>
            <div style={{ position: 'absolute', inset: 0 }}>
              <ValveLogo side="right" isOpen={false} strokeWidth={LOGO_STROKE_WIDTH} />
            </div>
          </div>
        </div>
      </div>

      {/* 标题与按钮层：标题用 padding-top 精确钉在46vh光学中心，
          按钮+链接以正常文档流跟在后面，不参与居中计算 */}
      <div
        className="relative z-10 flex flex-col items-center px-6 text-center"
        style={{
          opacity: revealed ? 0 : 1,
          transition: 'opacity 0.3s ease',
          pointerEvents: revealed ? 'none' : 'auto',
        }}
      >
        <div
          className="flex flex-col items-center gap-10 pt-[calc(46vh-1.875rem)] md:pt-[calc(46vh-3rem)]"
        >
          <h1
            className="text-6xl md:text-8xl font-light tracking-widest"
            style={{
              color: 'hsl(var(--foreground))',
              WebkitTextStroke: '1px hsl(var(--background))',
            }}
          >
            Mindo
          </h1>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleStart}
              className="px-12 py-4 rounded-full text-base font-medium tracking-[0.15em] transition-all duration-300 hover:opacity-90"
              style={{
                background: 'hsl(var(--foreground))',
                color: 'hsl(var(--background))',
              }}
            >
              {t('startButton')}
            </button>

            <Link
              href="/auth/login"
              className="text-sm transition-colors"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {t('loginLink')}
            </Link>
          </div>
        </div>
      </div>

      <div
        className="absolute top-4 right-4 flex items-center gap-3 z-20"
        style={{
          color: 'hsl(var(--muted-foreground))',
          opacity: revealed ? 0 : 1,
          transition: 'opacity 0.3s ease',
          pointerEvents: revealed ? 'none' : 'auto',
        }}
      >
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </div>
  );
}