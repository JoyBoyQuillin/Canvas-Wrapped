import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { AlertCircle, BarChart3, Maximize, Maximize2, Minimize, Minimize2, RotateCw, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeWrapped, RANGES, type Range } from '@/lib/wrapped';
import { timeAgo } from '@/lib/wrapped-slides';
import { buildSlides, type SlideDef } from '@/components/wrapped/slides';
import type { SlideId } from '@/lib/wrapped-copy';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { CarouselApi } from '@/components/ui/carousel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFullscreen, useIdle, useWrappedData } from './hooks';
import LoadingScreen from './LoadingScreen';
import NerdsSheet from './NerdsSheet';
import WrappedCarousel from './WrappedCarousel';

// Slides that play the same role in different ranges (week/month show page views instead of hours).
const EQUIVALENT_SLIDES: Partial<Record<SlideId, SlideId>> = { hours: 'pageviews', pageviews: 'hours' };

/** Where to open a (re)mounted carousel: same slide, else its equivalent, else the same position. */
function resolveIndex(slides: SlideDef[], at: { id: SlideId; index: number }): number {
  const find = (id: SlideId | undefined) => (id ? slides.findIndex((s) => s.id === id) : -1);
  const i = find(at.id);
  if (i >= 0) return i;
  const j = find(EQUIVALENT_SLIDES[at.id]);
  return j >= 0 ? j : Math.min(at.index, Math.max(slides.length - 1, 0));
}

const RANGE_LABELS: Record<Range, string> = { week: 'Week', month: 'Month', semester: 'Semester', all: 'All time' };

function RangePicker({ value, onChange, dark }: { value: Range; onChange: (r: Range) => void; dark?: boolean }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Range)}>
      <TabsList className={cn(dark && 'bg-white/10 backdrop-blur')} aria-label="Time range">
        {RANGES.map((r) => (
          <TabsTrigger
            key={r}
            value={r}
            className={cn('px-3', dark && 'text-white/70 hover:text-white data-[state=active]:bg-white data-[state=active]:text-black')}
          >
            {RANGE_LABELS[r]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/**
 * Launcher plus a full-viewport overlay. Wrapped opens immersive (full screen) once data is
 * ready; "shrink" drops to a centered panel. The overlay stays mounted while closed so state
 * (range, slide) survives reopening.
 */
export default function App() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [mode, setMode] = useState<'immersive' | 'panel'>('immersive');
  const [range, setRange] = useState<Range>('semester');
  const [menu, setMenu] = useState<{ x: number; y: number; slide: SlideDef } | null>(null);
  const [nerds, setNerds] = useState<{ slide: SlideDef | null } | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const rootRef = useRef<HTMLDivElement>(null);

  const data = useWrappedData(everOpened);
  const stats = useMemo(() => (data.entry ? computeWrapped(data.entry.input, range) : null), [data.entry, range]);
  const slides = useMemo(() => (stats ? buildSlides(stats) : []), [stats]);
  const ready = !!stats;
  const immersive = ready && mode === 'immersive';

  // The carousel remounts on shrink/expand and on range change; this keeps the viewer's place.
  // Tracked by slide id because each range has a different set of slides.
  const position = useRef<{ id: SlideId; index: number }>({ id: 'intro', index: 0 });
  const startIndex = resolveIndex(slides, position.current);
  const onIndexChange = useCallback(
    (index: number) => {
      const slide = slides[index];
      if (slide) position.current = { id: slide.id, index };
    },
    [slides],
  );

  const idle = useIdle(rootRef, 2500, open && immersive && !menu && !nerds);
  const fullscreen = useFullscreen(rootRef);

  useEffect(() => {
    if (open) rootRef.current?.focus();
  }, [open, immersive]);

  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    setOpen(false);
    setMenu(null);
    setNerds(null);
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (menu) setMenu(null);
      else if (nerds) setNerds(null);
      else close();
    } else if (!e.defaultPrevented && !nerds && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      // The carousel handles arrows itself when focused; this covers focus anywhere else.
      if (e.key === 'ArrowRight') api?.scrollNext();
      else api?.scrollPrev();
    }
  }

  function onSlideContextMenu(e: MouseEvent, slide: SlideDef) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, slide });
  }

  const updated = data.refreshing ? 'Updating…' : data.entry ? `Updated ${timeAgo(data.entry.savedAt)}` : '';

  const body = data.error && !data.entry ? (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't build your Wrapped</AlertTitle>
      <AlertDescription>
        <p>{data.error}</p>
        <Button variant="outline" size="sm" onClick={data.refresh} className="mt-2">
          <RotateCw /> Try again
        </Button>
      </AlertDescription>
    </Alert>
  ) : !ready ? (
    <LoadingScreen progress={data.progress} />
  ) : null;

  return (
    <div className="font-sans text-foreground">
      {!open && (
        <Button
          className="fixed right-4 bottom-4 z-[2147483647] rounded-full shadow-lg"
          size="lg"
          onClick={() => {
            setEverOpened(true);
            setOpen(true);
          }}
        >
          <Sparkles /> Canvas Wrapped
        </Button>
      )}

      {everOpened && (
        <div
          ref={rootRef}
          role="dialog"
          aria-modal="true"
          aria-label="Canvas Wrapped"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={cn(
            'fixed inset-0 z-[2147483647] outline-none',
            !open && 'hidden',
            immersive ? 'bg-black' : 'flex items-center justify-center bg-black/60 p-4',
            immersive && idle && 'cursor-none',
          )}
          onClick={(e) => !immersive && e.target === e.currentTarget && close()}
        >
          {immersive ? (
            <>
              <WrappedCarousel
                key={range}
                slides={slides}
                variant="immersive"
                controlsHidden={idle}
                onApi={setApi}
                onSlideContextMenu={onSlideContextMenu}
                startIndex={startIndex}
                onIndexChange={onIndexChange}
              />
              <div
                className={cn(
                  'absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 bg-linear-to-b from-black/50 to-transparent px-6 pt-9 pb-12 text-white transition-opacity duration-500',
                  idle && 'pointer-events-none opacity-0',
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" aria-hidden /> Canvas Wrapped</span>
                  <RangePicker value={range} onChange={setRange} dark />
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 hidden text-xs text-white/60 sm:inline">{updated}</span>
                  {[
                    { label: 'Refresh data', icon: RotateCw, onClick: data.refresh, spin: data.refreshing },
                    { label: fullscreen.isFullscreen ? 'Exit full screen' : 'Full screen', icon: fullscreen.isFullscreen ? Minimize : Maximize, onClick: fullscreen.toggle },
                    { label: 'Shrink to window', icon: Minimize2, onClick: () => setMode('panel') },
                    { label: 'Close', icon: X, onClick: close },
                  ].map(({ label, icon: Icon, onClick, spin }) => (
                    <Button
                      key={label}
                      variant="ghost"
                      size="icon"
                      onClick={onClick}
                      aria-label={label}
                      title={label}
                      className="text-white hover:bg-white/15 hover:text-white"
                    >
                      <Icon className={cn(spin && 'animate-spin')} />
                    </Button>
                  ))}
                </div>
              </div>
              <p className={cn('absolute right-6 bottom-5 z-20 hidden text-xs text-white/50 transition-opacity duration-500 md:block', idle && 'opacity-0')}>
                Right-click a slide for stats for nerds
              </p>
            </>
          ) : (
            <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 font-semibold">
                    <Sparkles className="size-4 text-primary" aria-hidden /> Canvas Wrapped
                  </span>
                  {ready && <RangePicker value={range} onChange={setRange} />}
                </div>
                <div className="flex items-center gap-1">
                  {ready && (
                    <>
                      <Button variant="ghost" size="icon" onClick={data.refresh} aria-label="Refresh data" title={updated}>
                        <RotateCw className={cn(data.refreshing && 'animate-spin')} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setMode('immersive')} aria-label="Expand to full screen" title="Expand">
                        <Maximize2 />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
                    <X />
                  </Button>
                </div>
              </header>
              <div className="min-h-0 overflow-y-auto p-4">
                {body ?? (
                  <>
                    <WrappedCarousel
                      key={range}
                      slides={slides}
                      variant="panel"
                      onApi={setApi}
                      onSlideContextMenu={onSlideContextMenu}
                      startIndex={startIndex}
                      onIndexChange={onIndexChange}
                    />
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      {updated} · Right-click a slide for stats for nerds
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {menu && (
            <>
              <div className="absolute inset-0 z-40" onPointerDown={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
              <div
                role="menu"
                className="fixed z-50 min-w-48 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
                style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 60) }}
              >
                <button
                  role="menuitem"
                  autoFocus
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:bg-accent"
                  onClick={() => {
                    setNerds({ slide: menu.slide });
                    setMenu(null);
                  }}
                >
                  <BarChart3 className="size-4" /> Stats for nerds
                </button>
              </div>
            </>
          )}

          {nerds && (
            <NerdsSheet slide={nerds.slide} stats={stats} savedAt={data.entry?.savedAt ?? null} onClose={() => setNerds(null)} />
          )}
        </div>
      )}
    </div>
  );
}
