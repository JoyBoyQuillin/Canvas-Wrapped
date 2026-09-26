import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/** Gradient per slide. Kept dark enough that white text stays readable. */
export const THEMES = {
  violet: 'from-violet-600 to-indigo-800',
  emerald: 'from-emerald-600 to-teal-800',
  fuchsia: 'from-fuchsia-600 to-pink-700',
  orange: 'from-orange-600 to-rose-700',
  sky: 'from-sky-600 to-blue-800',
  rose: 'from-rose-600 to-red-800',
  night: 'from-indigo-900 to-slate-950',
  amber: 'from-amber-600 to-orange-800',
  green: 'from-green-600 to-emerald-800',
  cyan: 'from-cyan-600 to-sky-800',
  finale: 'from-zinc-900 to-violet-950',
  sunrise: 'from-amber-600 via-orange-600 to-rose-700',
  day: 'from-sky-500 to-blue-700',
  dusk: 'from-orange-600 via-rose-700 to-purple-900',
  ghost: 'from-slate-700 to-zinc-900',
} as const;

export type Theme = keyof typeof THEMES;

// Slides live inside a carousel item marked `group/item` with data-active on the current one;
// content replays its entrance each time the slide becomes current.
const REVEAL =
  'motion-safe:group-data-[active=true]/item:animate-in motion-safe:group-data-[active=true]/item:fade-in motion-safe:group-data-[active=true]/item:slide-in-from-bottom-6 motion-safe:group-data-[active=true]/item:duration-700';
const REVEAL_ART =
  'motion-safe:group-data-[active=true]/item:animate-in motion-safe:group-data-[active=true]/item:fade-in motion-safe:group-data-[active=true]/item:zoom-in-90 motion-safe:group-data-[active=true]/item:duration-1000';

/**
 * One Wrapped slide. It's a size container: `@4xl/slide:` classes kick in when the slide is
 * immersive-sized (≥ 56rem wide), so the same slide works in the small panel and full screen.
 */
export function Slide({
  theme, eyebrow, art, quip, children,
}: { theme: Theme; eyebrow: string; art?: ReactNode; quip?: string; children: ReactNode }) {
  return (
    <Card
      className={cn(
        '@container/slide relative h-full min-h-[440px] gap-0 overflow-hidden rounded-2xl border-0 bg-linear-to-br py-0 text-white shadow-none',
        THEMES[theme],
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-white/10 blur-2xl @4xl/slide:size-[36rem]" />
      <CardContent className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col p-8 @4xl/slide:px-16 @4xl/slide:py-24">
        <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase @4xl/slide:text-sm">{eyebrow}</p>
        <div className="grid flex-1 items-center gap-10 pt-6 @4xl/slide:grid-cols-[minmax(0,1fr)_auto] @4xl/slide:gap-16">
          <div className={cn('flex min-w-0 flex-col gap-6 @4xl/slide:gap-8', REVEAL)}>
            {children}
            {quip && (
              <p className="border-l-2 border-white/50 pl-4 text-lg font-medium text-white/90 italic @4xl/slide:text-2xl">
                {quip}
              </p>
            )}
          </div>
          {art && (
            <div aria-hidden className={cn('hidden items-center justify-center @4xl/slide:flex', REVEAL_ART)}>
              {art}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function Headline({ children }: { children: ReactNode }) {
  return <h2 className="text-3xl leading-tight font-bold text-balance @4xl/slide:text-6xl">{children}</h2>;
}

/** Oversized title for archetype names. */
export function Title({ children }: { children: ReactNode }) {
  return <p className="text-5xl leading-[1.05] font-black tracking-tight text-balance @4xl/slide:text-8xl">{children}</p>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="text-base leading-relaxed text-white/80 @4xl/slide:text-2xl">{children}</p>;
}

/** The giant number a slide is built around. */
export function BigStat({ value, unit }: { value: ReactNode; unit?: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3">
      <span className="text-7xl leading-none font-black tracking-tight tabular-nums @4xl/slide:text-[10rem]">{value}</span>
      {unit && <span className="text-2xl font-semibold text-white/80 @4xl/slide:text-4xl">{unit}</span>}
    </p>
  );
}

/** Small translucent tag, e.g. a course's semester. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <Badge variant="outline" className="border-white/30 bg-white/10 font-medium text-white/90 @4xl/slide:text-sm">
      {children}
    </Badge>
  );
}

export interface BarItem {
  label: string;
  value: number;
  display: string;
  tag?: string | null;
}

/** Ranked horizontal bars, scaled to the largest value. */
export function BarList({ items, ranked = false }: { items: BarItem[]; ranked?: boolean }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="flex flex-col gap-3 @4xl/slide:gap-5">
      {items.map((item, i) => (
        <li key={item.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4 text-sm @4xl/slide:text-lg">
            <span className="flex min-w-0 items-center gap-2 font-medium">
              {ranked && <span className="text-white/60 tabular-nums">{i + 1}</span>}
              <span className="truncate">{item.label}</span>
              {item.tag && <Tag>{item.tag}</Tag>}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{item.display}</span>
          </div>
          <div className="h-2 rounded-full bg-white/15 @4xl/slide:h-3">
            <div className="h-full rounded-full bg-white" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Small labelled figure for grids. */
export function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/10 p-4 @4xl/slide:p-6">
      <p className="text-xs font-medium tracking-wide text-white/60 uppercase @4xl/slide:text-sm">{label}</p>
      <p className="mt-1 text-lg leading-snug font-bold text-balance break-words @4xl/slide:text-2xl">{value}</p>
    </div>
  );
}

/** Callout card, e.g. "Closest call". */
export function Callout({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4 @4xl/slide:p-6">
      <p className="text-xs font-medium tracking-wide text-white/60 uppercase @4xl/slide:text-sm">{label}</p>
      <p className="mt-1 line-clamp-2 font-semibold @4xl/slide:text-xl">{title}</p>
      <p className="text-sm text-white/70 @4xl/slide:text-base">{detail}</p>
    </div>
  );
}
