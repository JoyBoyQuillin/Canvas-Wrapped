import { useState } from 'react';
import { computeWrapped, type WrappedStats } from '@/lib/wrapped';
import { fetchWrappedInput } from '@/lib/wrapped-fetch';
import { wrappedSlides } from '@/lib/wrapped-slides';

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; stats: WrappedStats; ms: number } | { kind: 'error'; message: string };

/** Text-only Wrapped from live Canvas data, to check the numbers before the real slide UI. */
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
            {wrappedSlides(status.stats).map((lines, i) => (
              <section key={i}>
                <h3>Slide {i + 1}</h3>
                <pre className="slide">{lines.join('\n')}</pre>
              </section>
            ))}
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
