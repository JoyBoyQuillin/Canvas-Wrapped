import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

export default function WrappedCarousel({ slides }: { slides: string[][] }) {
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
      className="my-4 w-full min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Your Canvas Wrapped slides"
      tabIndex={0}
    >
      <CarouselContent className="touch-pan-y">
        {slides.map(([title, ...lines], index) => (
          <CarouselItem
            key={index}
            className="flex"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={index !== current}
          >
            <div className="flex w-full min-w-0 p-1">
              <Card className="w-full min-w-0 border-primary/20 bg-card shadow-sm">
                <CardContent className="flex min-h-72 flex-col justify-center gap-6 px-5 py-6 text-left">
                  <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                    Canvas Wrapped / {String(index + 1).padStart(2, '0')}
                  </p>
                  <h2 className="text-2xl leading-snug font-semibold wrap-anywhere text-card-foreground">
                    {title}
                  </h2>
                  {lines.length > 0 && (
                    <div className="space-y-3 text-base leading-relaxed text-muted-foreground">
                      {lines.map((line, lineIndex) => (
                        <p key={lineIndex} className="whitespace-pre-wrap wrap-anywhere">{line}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="mt-4 flex items-center justify-center gap-4">
        <CarouselPrevious className="static size-10 translate-y-0 p-0" />
        <p className="min-w-24 text-center text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
          Slide {current + 1} of {slides.length}
        </p>
        <CarouselNext className="static size-10 translate-y-0 p-0" />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Swipe or use the arrows to explore your Wrapped.
      </p>
    </Carousel>
  );
}
