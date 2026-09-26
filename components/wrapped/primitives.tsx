import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
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
} as const;

export type Theme = keyof typeof THEMES;

export function Slide({ theme, eyebrow, children }: { theme: Theme; eyebrow: string; children: ReactNode }) {
  return (
    <Card
      className={cn(
        'relative h-full min-h-[440px] gap-0 overflow-hidden rounded-2xl border-0 bg-linear-to-br py-0 text-white shadow-none',
        THEMES[theme],
      )}
    >
      {/* Decorative glow; purely visual. */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-white/10 blur-2xl" />
      <CardContent className="relative flex flex-1 flex-col p-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">{eyebrow}</p>
        <div className="flex flex-1 flex-col justify-center gap-6 pt-6">{children}</div>
      </CardContent>
    </Card>
  );
}

export function Headline({ children }: { children: ReactNode }) {
  return <h2 className="text-3xl leading-tight font-bold text-balance">{children}</h2>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="text-base leading-relaxed text-white/80">{children}</p>;
}

/** The giant number a slide is built around. */
export function BigStat({ value, unit }: { value: ReactNode; unit?: string }) {
  return (
    <p className="flex items-baseline gap-3">
      <span className="text-7xl leading-none font-black tracking-tight tabular-nums">{value}</span>
      {unit && <span className="text-2xl font-semibold text-white/80">{unit}</span>}
    </p>
  );
}

export interface BarItem {
  label: string;
  value: number;
  display: string;
}

/** Ranked horizontal bars, scaled to the largest value. */
export function BarList({ items, ranked = false }: { items: BarItem[]; ranked?: boolean }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item.label} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate font-medium">
              {ranked && <span className="mr-2 text-white/60 tabular-nums">{i + 1}</span>}
              {item.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{item.display}</span>
          </div>
          <div className="h-2 rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Small labelled figure for the recap grid. */
export function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <p className="text-xs font-medium tracking-wide text-white/60 uppercase">{label}</p>
      <p className="mt-1 text-lg leading-snug font-bold text-balance break-words">{value}</p>
    </div>
  );
}
