import { useEffect, useState } from 'react';
import type { FetchProgress } from '@/lib/wrapped-fetch';
import { Equalizer } from '@/components/wrapped/art';
import { Progress } from '@/components/ui/progress';

const TEASERS = [
  'Counting every Submit button you’ve ever pressed…',
  'Figuring out if you’re a night owl…',
  'Measuring how close you cut it on deadlines…',
  'Asking Canvas how long you’ve been staring at it…',
  'Finding your favorite class (we won’t tell)…',
  'Tallying perfect scores…',
];

/** First-load screen. With pre-caching, most people only see this once. */
export default function LoadingScreen({ progress }: { progress: FetchProgress | null }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(id);
  }, []);
  const value = progress ? (progress.done / progress.total) * 100 : 4;

  return (
    <div
      className="@container/slide relative flex min-h-[480px] flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl bg-linear-to-br from-violet-600 via-fuchsia-600 to-indigo-800 p-8 text-center text-white"
      role="status"
      aria-live="polite"
    >
      {/* Drifting glow blobs */}
      <div aria-hidden className="absolute -top-20 -left-16 size-72 rounded-full bg-white/15 blur-3xl motion-safe:animate-float" />
      <div aria-hidden className="absolute -right-24 -bottom-24 size-96 rounded-full bg-fuchsia-300/20 blur-3xl motion-safe:animate-float [animation-delay:-3s]" />

      <Equalizer className="relative h-20 gap-2 [&>div]:w-3" />

      <div className="relative flex max-w-md flex-col gap-3">
        <h2 className="text-3xl font-black tracking-tight">Wrapping up your semester…</h2>
        <p key={tick} className="min-h-6 text-white/85 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
          {TEASERS[tick % TEASERS.length]}
        </p>
      </div>

      <div className="relative flex w-full max-w-sm flex-col gap-2">
        <Progress value={value} className="h-1.5 bg-white/20 [&>div]:bg-white" />
        <p className="text-xs text-white/70">
          {progress ? `${progress.step} · ${progress.done} of ${progress.total}` : 'Getting started'}
        </p>
      </div>
    </div>
  );
}
