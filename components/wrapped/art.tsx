// Slide illustrations and small charts. All inline SVG/CSS (no image files), white-on-gradient,
// and every animation is motion-safe so reduced-motion users get a still picture.

import { useId, type CSSProperties } from 'react';
import { Flame, Ghost, Hourglass, Moon, Repeat, Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClockArchetype, DeadlineArchetype } from '@/lib/archetypes';
import type { Theme } from './primitives';

const ART = 'size-64 @5xl/slide:size-80';
const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

// ── Archetype art ────────────────────────────────────────────────────────────

function Stars({ count = 8 }: { count?: number }) {
  const spots = [[24, 30, 3], [170, 24, 2], [160, 150, 3], [30, 170, 2], [182, 96, 2.5], [14, 104, 2], [110, 16, 2], [96, 184, 2.5]];
  return (
    <>
      {spots.slice(0, count).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="white" className="motion-safe:animate-twinkle" style={delay(i * 300)} />
      ))}
    </>
  );
}

function NightOwlArt() {
  const mask = useId();
  return (
    <svg viewBox="0 0 200 200" className={ART}>
      <defs>
        <mask id={mask}>
          <rect width="200" height="200" fill="white" />
          <circle cx="128" cy="78" r="58" fill="black" />
        </mask>
      </defs>
      <Stars />
      <circle cx="100" cy="100" r="66" fill="white" mask={`url(#${mask})`} />
    </svg>
  );
}

function SunArt({ horizon, spin = false }: { horizon: number | null; spin?: boolean }) {
  const clip = useId();
  const cy = horizon ?? 100;
  return (
    <svg viewBox="0 0 200 200" className={ART}>
      <defs>
        <clipPath id={clip}><rect width="200" height={horizon ?? 200} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g
          className={cn('[transform-box:view-box]', spin && 'motion-safe:animate-spin')}
          style={{ transformOrigin: `100px ${cy}px`, animationDuration: '40s' }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="100" y1={cy - 58} x2="100" y2={cy - 80}
              stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.8"
              transform={`rotate(${i * 30} 100 ${cy})`}
            />
          ))}
        </g>
        <circle cx="100" cy={cy} r="44" fill="white" />
      </g>
      {horizon !== null && (
        <>
          <line x1="10" y1={horizon} x2="190" y2={horizon} stroke="white" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1={horizon + 18} x2="160" y2={horizon + 18} stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
          <line x1="70" y1={horizon + 34} x2="130" y2={horizon + 34} stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.25" />
        </>
      )}
    </svg>
  );
}

function IconArt({ icon: Icon, className }: { icon: typeof Ghost; className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', ART)}>
      <div className="absolute inset-6 rounded-full bg-white/10" />
      <Icon className={cn('relative size-32 @5xl/slide:size-40', className)} strokeWidth={1.5} />
    </div>
  );
}

function DaredevilArt() {
  // A clock at 11:58 with a flame behind it.
  return (
    <div className={cn('relative flex items-center justify-center', ART)}>
      <Flame className="absolute size-full text-white/25 motion-safe:animate-pulse" strokeWidth={1} />
      <svg viewBox="0 0 200 200" className="relative size-3/5">
        <circle cx="100" cy="100" r="88" fill="none" stroke="white" strokeWidth="8" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="100" y1="22" x2="100" y2="34" stroke="white" strokeWidth="6" strokeLinecap="round" transform={`rotate(${i * 30} 100 100)`} />
        ))}
        <line x1="100" y1="100" x2="100" y2="52" stroke="white" strokeWidth="8" strokeLinecap="round" transform="rotate(-1 100 100)" />
        <line x1="100" y1="100" x2="100" y2="34" stroke="white" strokeWidth="5" strokeLinecap="round" transform="rotate(-12 100 100)" />
        <circle cx="100" cy="100" r="7" fill="white" />
      </svg>
    </div>
  );
}

function PlannerArt() {
  // A month grid filling in, most days checked off.
  return (
    <div className={cn('grid grid-cols-7 content-center gap-2 p-4', ART)}>
      {Array.from({ length: 35 }, (_, i) => (
        <div
          key={i}
          className={cn('aspect-square rounded-md motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:fill-mode-both', i < 26 ? 'bg-white' : 'bg-white/20')}
          style={delay(i * 35)}
        />
      ))}
    </div>
  );
}

export const DEADLINE_THEME: Record<DeadlineArchetype, Theme> = {
  mystery: 'ghost',
  daredevil: 'rose',
  'just-in-time': 'amber',
  planner: 'emerald',
};

export const CLOCK_THEME: Record<ClockArchetype, Theme> = {
  ghost: 'ghost',
  'early-bird': 'sunrise',
  daytime: 'day',
  evening: 'dusk',
  'night-owl': 'night',
};

export function DeadlineArt({ archetype }: { archetype: DeadlineArchetype }) {
  switch (archetype) {
    case 'daredevil': return <DaredevilArt />;
    case 'just-in-time': return <IconArt icon={Hourglass} className="motion-safe:animate-pulse" />;
    case 'planner': return <PlannerArt />;
    case 'mystery': return <IconArt icon={Sparkles} />;
  }
}

export function ClockArt({ archetype }: { archetype: ClockArchetype }) {
  switch (archetype) {
    case 'night-owl': return <NightOwlArt />;
    case 'early-bird': return <SunArt horizon={130} />;
    case 'daytime': return <SunArt horizon={null} spin />;
    case 'evening': return <SunArt horizon={96} />;
    case 'ghost': return <IconArt icon={Ghost} className="motion-safe:animate-bounce" />;
  }
}

export const TrophyArt = () => <IconArt icon={Trophy} />;
export const RepeatArt = () => <IconArt icon={Repeat} className="motion-safe:animate-spin [animation-duration:6s]" />;
export const QuietArt = () => <IconArt icon={Moon} />;

/** Spotify-ish equalizer bars. */
export function Equalizer({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-40 items-end gap-3', className)} aria-hidden>
      {[0.6, 1, 0.75, 0.9, 0.5, 0.8].map((h, i) => (
        <div
          key={i}
          className="w-6 origin-bottom rounded-full bg-white motion-safe:animate-equalizer"
          style={{ height: `${h * 100}%`, ...delay(i * 140) }}
        />
      ))}
    </div>
  );
}

// ── Charts ───────────────────────────────────────────────────────────────────

/** Ring chart for a 0–1 share. */
export function Donut({ value, label, className }: { value: number; label: string; className?: string }) {
  const c = 2 * Math.PI * 42;
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <div className={cn('relative size-36 shrink-0 @4xl/slide:size-56', className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${v * c} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-black @4xl/slide:text-4xl">{label}</span>
    </div>
  );
}

/** Small ring per course: score (capped at 100 for the ring) with letter grade underneath. */
export function GradeRing({ score, grade, label, tag }: { score: number; grade: string | null; label: string; tag?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <Donut value={score / 100} label={grade ?? `${Math.round(score)}`} className="size-20 @4xl/slide:size-36 [&_span]:text-xl @4xl/slide:[&_span]:text-4xl" />
      <p className="w-full truncate text-sm font-semibold @4xl/slide:text-base">{label}</p>
      <p className="text-xs text-white/70 tabular-nums @4xl/slide:text-sm">{score}%{tag ? ` · ${tag}` : ''}</p>
    </div>
  );
}

const SEGMENT_OPACITY = [1, 0.7, 0.5, 0.35, 0.22, 0.15];

/** One bar split by share, with a legend. */
export function StackedBar({ items }: { items: { label: string; count: number }[] }) {
  const total = items.reduce((a, i) => a + i.count, 0) || 1;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-5 gap-1 overflow-hidden rounded-full @4xl/slide:h-8">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="h-full bg-white first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(item.count / total) * 100}%`, opacity: SEGMENT_OPACITY[i] ?? 0.1 }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm @4xl/slide:text-lg">
        {items.map((item, i) => (
          <li key={item.label} className="flex min-w-0 items-center gap-2">
            <span className="size-3 shrink-0 rounded-full bg-white" style={{ opacity: SEGMENT_OPACITY[i] ?? 0.1 }} />
            <span className="truncate">{item.label}</span>
            <span className="ml-auto font-semibold tabular-nums">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One square per hour (or per N hours when there are lots). */
export function Waffle({ hours }: { hours: number }) {
  const per = Math.max(1, Math.ceil(hours / 100));
  const squares = Math.max(1, Math.round(hours / per));
  return (
    <figure className="flex flex-col gap-2">
      <div className="grid w-full max-w-lg grid-cols-20 gap-1 @4xl/slide:gap-1.5" aria-hidden>
        {Array.from({ length: squares }, (_, i) => (
          <div
            key={i}
            className="aspect-square rounded-[3px] bg-white motion-safe:group-data-[active=true]/item:animate-in motion-safe:group-data-[active=true]/item:fade-in motion-safe:fill-mode-both"
            style={delay(i * 12)}
          />
        ))}
      </div>
      <figcaption className="text-xs text-white/60 @4xl/slide:text-sm">Each square is {per === 1 ? 'one hour' : `${per} hours`}.</figcaption>
    </figure>
  );
}

/** A loose cluster of chat bubbles, one per conversation (capped). */
export function Bubbles({ count }: { count: number }) {
  const n = Math.min(count, 24);
  return (
    <div className="flex max-w-md flex-wrap items-end gap-2" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const size = 20 + ((i * 37) % 5) * 8; // deterministic variety
        return (
          <div
            key={i}
            className="rounded-full rounded-bl-sm bg-white motion-safe:group-data-[active=true]/item:animate-in motion-safe:group-data-[active=true]/item:zoom-in-50 motion-safe:fill-mode-both"
            style={{ width: size, height: size * 0.75, opacity: 0.35 + ((i * 53) % 7) / 10, ...delay(i * 45) }}
          />
        );
      })}
    </div>
  );
}
