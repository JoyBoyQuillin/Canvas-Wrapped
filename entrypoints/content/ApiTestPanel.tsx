import { useMemo, useState } from 'react';
import { runApiTest, type ApiResult } from '@/lib/endpoints';

const PREVIEW_LINES = 200;

function groupResults(results: ApiResult[]): [string, ApiResult[]][] {
  const groups = new Map<string, ApiResult[]>();
  for (const r of results) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group)!.push(r);
  }
  return [...groups.entries()];
}

function download(filename: string, text: string, host: Node) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  host.appendChild(a); // Firefox needs the anchor in the DOM
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function summaryText(results: ApiResult[]): string {
  return groupResults(results)
    .map(([group, rows]) =>
      [`## ${group}`, ...rows.map((r) =>
        `${r.ok ? 'OK ' : 'ERR'} ${r.status} ${r.label} — ${r.count ?? 'obj'} items, ${r.pages}p, ${r.ms}ms${r.truncated ? ' (truncated)' : ''}`,
      )].join('\n'))
    .join('\n\n');
}

function JsonPreview({ data }: { data: unknown }) {
  const [showAll, setShowAll] = useState(false);
  const lines = useMemo(() => JSON.stringify(data, null, 2)?.split('\n') ?? ['undefined'], [data]);
  const hidden = lines.length - PREVIEW_LINES;
  return (
    <div className="json">
      <pre>{(showAll ? lines : lines.slice(0, PREVIEW_LINES)).join('\n')}</pre>
      {hidden > 0 && (
        <button className="link" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show less' : `Show all (${hidden} more lines)`}
        </button>
      )}
    </div>
  );
}

function ResultRow({ r }: { r: ApiResult }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="row" onClick={() => setOpen(!open)} title={r.path}>
        <td><span className={`badge ${r.ok ? 'ok' : 'err'}`}>{r.status || 'ERR'}</span></td>
        <td className="label">{open ? '▾' : '▸'} {r.label}</td>
        <td className="num">{r.count ?? '—'}{r.truncated ? '+' : ''}</td>
        <td className="num">{r.pages}</td>
        <td className="num">{r.ms}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="detail">
            <div className="path">GET {r.path}</div>
            {r.error && <div className="error">{r.error}</div>}
            <JsonPreview data={r.data} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function ApiTestPanel() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ApiResult[]>([]);
  const [total, setTotal] = useState(0);
  const [copied, setCopied] = useState(false);
  const [panelEl, setPanelEl] = useState<HTMLElement | null>(null);

  const groups = useMemo(() => groupResults(results), [results]);
  const okCount = results.filter((r) => r.ok).length;

  async function run() {
    setRunning(true);
    setResults([]);
    setTotal(0);
    await runApiTest((rs, t) => {
      setResults(rs);
      setTotal(t);
    });
    setRunning(false);
  }

  function downloadJson() {
    const dump = { fetchedAt: new Date().toISOString(), origin: location.origin, results };
    const stamp = new Date().toISOString().slice(0, 10);
    download(`canvas-dump-${stamp}.json`, JSON.stringify(dump, null, 2), panelEl!);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summaryText(results));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!open) {
    return (
      <button className="fab" onClick={() => setOpen(true)}>
        Canvas Wrapped · API test
      </button>
    );
  }

  return (
    <div className="panel" ref={setPanelEl}>
      <header>
        <strong>Canvas Wrapped · API test</strong>
        <button className="icon" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </header>

      <div className="toolbar">
        <button className="primary" onClick={run} disabled={running}>
          {running ? 'Running…' : results.length ? 'Run again' : 'Run API test'}
        </button>
        <button onClick={downloadJson} disabled={running || !results.length}>Download JSON</button>
        <button onClick={copySummary} disabled={running || !results.length}>
          {copied ? 'Copied!' : 'Copy summary'}
        </button>
      </div>

      {total > 0 && (
        <div className="progress">
          <div className="bar"><div style={{ width: `${(results.length / total) * 100}%` }} /></div>
          <span>{results.length} / {total} requests · {okCount} OK · {results.length - okCount} failed</span>
        </div>
      )}

      <div className="results">
        {groups.map(([group, rows]) => (
          <section key={group}>
            <h3>{group}</h3>
            <table>
              <thead>
                <tr><th /><th>Endpoint</th><th className="num">Items</th><th className="num">Pages</th><th className="num">ms</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => <ResultRow key={r.path} r={r} />)}
              </tbody>
            </table>
          </section>
        ))}
        {!results.length && !running && (
          <p className="empty">
            Calls every Canvas API endpoint a student can reach, using your current login.
            Nothing leaves your browser unless you download it.
          </p>
        )}
      </div>
    </div>
  );
}
