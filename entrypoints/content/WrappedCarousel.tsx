import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { cn } from '@/lib/utils';
import type { SlideDef } from '@/components/wrapped/slides';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

interface Props {
  slides: SlideDef[];
  variant: 'immersive' | 'panel';
  controlsHidden?: boolean; // immersive: fade arrows/counter while idle
  onApi?: (api: CarouselApi) => void;
  onSlideContextMenu?: (e: MouseEvent, slide: SlideDef) => void;
  startIndex?: number; // slide to open on; read once when the carousel mounts
  onIndexChange?: (index: number) => void;
}

export default function WrappedCarousel({
  slides, variant, controlsHidden = false, onApi, onSlideContextMenu, startIndex = 0, onIndexChange,
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  // Frozen at mount: if it tracked the live position, Embla would re-init (and jump) on every swipe.
  const [initialIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(slides.length - 1, 0)));
  const [current, setCurrent] = useState(initialIndex);
  const immersive = variant === 'immersive';
  // Two-finger trackpad swipes (horizontal wheel events). 'x' only, so vertical scrolling still scrolls.
  const [plugins] = useState(() => [WheelGesturesPlugin({ forceWheelAxis: 'x' })]);
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  useEffect(() => {
    if (!api) return;
    onApi?.(api);
    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    // Only real navigation is reported, not mount/re-init, so landing on a fallback slide
    // doesn't overwrite where the viewer actually was.
    const onSelect = () => {
      updateCurrent();
      onIndexChangeRef.current?.(api.selectedScrollSnap());
    };
    updateCurrent();
    api.on('select', onSelect);
    api.on('reInit', updateCurrent);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', updateCurrent);
    };
  }, [api, onApi]);

  if (!slides.length) return null;

  const fade = cn('transition-opacity duration-500', controlsHidden && 'pointer-events-none opacity-0');

  // Story-style progress: one segment per slide, click to jump.
  const segments = (
    <div className={cn('flex gap-1', immersive ? 'absolute inset-x-4 top-3 z-30' : 'mb-3')}>
      {slides.map((slide, i) => (
        <button
          key={slide.id}
          type="button"
          onClick={() => api?.scrollTo(i)}
          aria-label={`Go to slide ${i + 1}: ${slide.title}`}
          aria-current={i === current ? 'step' : undefined}
          className="group flex-1 cursor-pointer py-1.5"
        >
          <span
            className={cn(
              'block h-1 rounded-full transition-colors',
              immersive
                ? i <= current ? 'bg-white' : 'bg-white/30 group-hover:bg-white/50'
                : i <= current ? 'bg-primary' : 'bg-muted group-hover:bg-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );

  const counter = (
    <p
      className={cn('min-w-40 text-center text-sm', immersive ? 'text-white/80' : 'text-muted-foreground')}
      role="status" aria-live="polite" aria-atomic="true"
    >
      <span className={cn('font-medium', immersive ? 'text-white' : 'text-foreground')}>{slides[current]?.title}</span>
      {' · '}{current + 1} / {slides.length}
    </p>
  );

  return (
    <Carousel
      setApi={setApi}
      plugins={plugins}
      opts={{
        align: 'start',
        startIndex: initialIndex,
        loop: false,
        breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } },
      }}
      className={cn(
        'w-full min-w-0 outline-none',
        immersive
          ? 'h-full [&_[data-slot=carousel-content]]:h-full'
          : 'rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
      aria-label="Your Canvas Wrapped slides"
      tabIndex={0}
    >
      {segments}

      <CarouselContent className={cn('touch-pan-y', immersive && 'ml-0 h-full')}>
        {slides.map((slide, index) => (
          <CarouselItem
            key={slide.id}
            className={cn('group/item flex', immersive && 'pl-0 [&_[data-slot=card]]:min-h-0 [&_[data-slot=card]]:rounded-none')}
            data-active={index === current}
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-hidden={index !== current}
          >
            <div className="w-full min-w-0" onContextMenu={onSlideContextMenu && ((e) => onSlideContextMenu(e, slide))}>
              {slide.content}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {immersive ? (
        <>
          <CarouselPrevious
            className={cn('left-4 z-20 size-12 border-white/20 bg-black/20 text-white backdrop-blur hover:bg-black/40 hover:text-white disabled:opacity-0', fade)}
          />
          <CarouselNext
            className={cn('right-4 z-20 size-12 border-white/20 bg-black/20 text-white backdrop-blur hover:bg-black/40 hover:text-white disabled:opacity-0', fade)}
          />
          <div className={cn('absolute inset-x-0 bottom-5 z-20 flex justify-center', fade)}>{counter}</div>
        </>
      ) : (
        <div className="mt-4 flex items-center justify-center gap-4">
          <CarouselPrevious className="static size-10 translate-y-0" />
          {counter}
          <CarouselNext className="static size-10 translate-y-0" />
        </div>
      )}
    </Carousel>
  );
}
