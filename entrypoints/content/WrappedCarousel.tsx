import { useEffect, useState } from 'react';
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

export default function WrappedCarousel({ slides }: { slides: SlideDef[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on('select', updateCurrent);
    api.on('reInit', updateCurrent);
    return () => {
      api.off('select', updateCurrent);
      api.off('reInit', updateCurrent);
    };
  }, [api]);

  if (!slides.length) return null;

  return (
    <Carousel
      setApi={setApi}
      opts={{
        align: 'start',
        loop: false,
        breakpoints: { '(prefers-reduced-motion: reduce)': { duration: 0 } },
      }}
      className="w-full min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Your Canvas Wrapped slides"
      tabIndex={0}
    >
      {/* Story-style progress: one segment per slide, click to jump. */}
      <div className="mb-3 flex gap-1">
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
                i <= current ? 'bg-primary' : 'bg-muted group-hover:bg-muted-foreground/30',
              )}
            />
          </button>
        ))}
      </div>

      <CarouselContent className="touch-pan-y">
        {slides.map((slide, index) => (
          <CarouselItem
            key={slide.id}
            className="flex"
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-hidden={index !== current}
          >
            <div className="w-full min-w-0">{slide.content}</div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="mt-4 flex items-center justify-center gap-4">
        <CarouselPrevious className="static size-10 translate-y-0" />
        <p className="min-w-40 text-center text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
          <span className="font-medium text-foreground">{slides[current]?.title}</span> · {current + 1} / {slides.length}
        </p>
        <CarouselNext className="static size-10 translate-y-0" />
      </div>
    </Carousel>
  );
}
