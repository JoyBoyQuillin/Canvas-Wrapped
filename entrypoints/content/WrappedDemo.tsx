import { useMemo, useState } from 'react';
import { AlertCircle, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { computeWrapped, type WrappedStats } from '@/lib/wrapped';
import { fetchWrappedInput } from '@/lib/wrapped-fetch';
import { buildSlides } from '@/components/wrapped/slides';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import WrappedCarousel from './WrappedCarousel';

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; stats: WrappedStats; ms: number } | { kind: 'error'; message: string };

/** Wrapped slides built from live Canvas data. */
export default function WrappedDemo() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const slides = useMemo(() => (status.kind === 'done' ? buildSlides(status.stats) : []), [status]);

  async function run() {
    setStatus({ kind: 'loading' });
    const start = performance.now();
    try {
      const stats = computeWrapped(await fetchWrappedInput());
      setStatus({ kind: 'done', stats, ms: Math.round(performance.now() - start) });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }

  if (status.kind === 'idle') {
    return (
      <div className="flex min-h-[440px] flex-col items-center justify-center gap-5 rounded-2xl bg-linear-to-br from-violet-600 to-indigo-800 p-8 text-center text-white">
        <Sparkles className="size-10" aria-hidden />
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tight">Your semester, wrapped.</h2>
          <p className="mx-auto max-w-sm text-white/80">
            Hours, deadlines, grades and study habits, pulled from Canvas with your current login.
            Nothing leaves your browser.
          </p>
        </div>
        <Button size="lg" onClick={run} className="bg-white text-violet-700 hover:bg-white/90">
          Generate my Wrapped
        </Button>
      </div>
    );
  }

  if (status.kind === 'loading') {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-1 w-full" />
        <div className="relative">
          <Skeleton className="h-[440px] w-full rounded-2xl" />
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Pulling your courses, grades and submissions…
          </p>
        </div>
      </div>
    );
  }

  if (status.kind === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Couldn't build your Wrapped</AlertTitle>
        <AlertDescription>
          <p>{status.message}</p>
          <Button variant="outline" size="sm" onClick={run} className="mt-2">
            <RotateCw /> Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WrappedCarousel slides={slides} />
      <div className="flex items-center justify-between gap-4 border-t pt-3 text-xs text-muted-foreground">
        <span>Built in {(status.ms / 1000).toFixed(1)}s from live Canvas data.</span>
        <Button variant="ghost" size="sm" onClick={run}>
          <RotateCw /> Regenerate
        </Button>
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Raw stats</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted p-3 font-mono whitespace-pre-wrap">
          {JSON.stringify(status.stats, null, 2)}
        </pre>
      </details>
    </div>
  );
}
