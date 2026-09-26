import { useState } from 'react';
import { computeWrapped, type WrappedStats } from '@/lib/wrapped';
import { fetchWrappedInput } from '@/lib/wrapped-fetch';
import { wrappedSlides } from '@/lib/wrapped-slides';
import WrappedCarousel from './WrappedCarousel';

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; stats: WrappedStats; ms: number } | { kind: 'error'; message: string };

/** Wrapped cards built from live Canvas data and the shared slide formatter. */
export default function WrappedDemo() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

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

  return (
    <>
      <div className="toolbar">
        <button className="primary" onClick={run} disabled={status.kind === 'loading'}>
          {status.kind === 'loading' ? 'Loading…' : status.kind === 'done' ? 'Run again' : 'Run Wrapped'}
        </button>
      </div>

      <div className="results">
        {status.kind === 'idle' && (
          <p className="empty">
            Builds your Wrapped from live Canvas data using your current login.
            Nothing leaves your browser.
          </p>
        )}
        {status.kind === 'error' && <div className="error">{status.message}</div>}
        {status.kind === 'done' && (
          <>
            <p className="empty">Fetched and computed in {(status.ms / 1000).toFixed(1)}s.</p>
            <WrappedCarousel slides={wrappedSlides(status.stats)} />
            <details>
              <summary>Raw stats</summary>
              <div className="json"><pre>{JSON.stringify(status.stats, null, 2)}</pre></div>
            </details>
          </>
        )}
      </div>
    </>
  );
}
