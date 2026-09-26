import { useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Copy, Download, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runApiTest, type ApiResult } from '@/lib/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    <div>
      <pre className="max-h-90 overflow-auto font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
        {(showAll ? lines : lines.slice(0, PREVIEW_LINES)).join('\n')}
      </pre>
      {hidden > 0 && (
        <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show less' : `Show all (${hidden} more lines)`}
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ r }: { r: ApiResult }) {
  return (
    <Badge
      variant={r.ok ? 'secondary' : 'destructive'}
      className={cn('min-w-10 font-mono', r.ok && 'bg-emerald-100 text-emerald-800')}
    >
      {r.status || 'ERR'}
    </Badge>
  );
}

function ResultRow({ r }: { r: ApiResult }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setOpen(!open)} title={r.path} aria-expanded={open}>
        <TableCell className="w-12"><StatusBadge r={r} /></TableCell>
        <TableCell className="w-full">
          <span className="flex items-center gap-1">
            <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} aria-hidden />
            {r.label}
          </span>
        </TableCell>
        <TableCell className="text-right tabular-nums">{r.count ?? '—'}{r.truncated ? '+' : ''}</TableCell>
        <TableCell className="text-right tabular-nums">{r.pages}</TableCell>
        <TableCell className="text-right tabular-nums">{r.ms}</TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={5} className="whitespace-normal">
            <p className="mb-1 font-mono text-[11px] break-all text-muted-foreground">GET {r.path}</p>
            {r.error && <p className="mb-1 text-destructive">{r.error}</p>}
            <JsonPreview data={r.data} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** Developer tool: hit every student-accessible endpoint and inspect the responses. */
export default function ApiTest() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ApiResult[]>([]);
  const [total, setTotal] = useState(0);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    download(`canvas-dump-${stamp}.json`, JSON.stringify(dump, null, 2), rootRef.current!);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summaryText(results));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />}
          {running ? 'Running…' : results.length ? 'Run again' : 'Run API test'}
        </Button>
        <Button variant="outline" onClick={downloadJson} disabled={running || !results.length}>
          <Download /> Download JSON
        </Button>
        <Button variant="outline" onClick={copySummary} disabled={running || !results.length}>
          {copied ? <Check /> : <Copy />} {copied ? 'Copied!' : 'Copy summary'}
        </Button>
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-1.5">
          <Progress value={(results.length / total) * 100} />
          <p className="text-xs text-muted-foreground">
            {results.length} / {total} requests · {okCount} OK · {results.length - okCount} failed
          </p>
        </div>
      )}

      {groups.map(([group, rows]) => (
        <section key={group}>
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><span className="sr-only">Status</span></TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">ms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => <ResultRow key={r.path} r={r} />)}
            </TableBody>
          </Table>
        </section>
      ))}

      {!results.length && !running && (
        <p className="text-muted-foreground">
          Calls every Canvas API endpoint a student can reach, using your current login.
          Nothing leaves your browser unless you download it.
        </p>
      )}
    </div>
  );
}
