// Minimal Canvas REST client for use inside the content script. Requests are
// same-origin with the logged-in Canvas page, so the session cookie authenticates us.

const MAX_PAGES = 10;

export interface CanvasResponse {
  path: string;
  status: number; // 0 = network error / exception
  ok: boolean;
  ms: number;
  pages: number;
  count: number | null; // array length, or null for object responses
  truncated: boolean; // hit MAX_PAGES while more pages existed
  data: unknown;
  error?: string;
}

function withPerPage(path: string): string {
  const url = new URL(path, location.origin);
  if (!url.searchParams.has('per_page')) url.searchParams.set('per_page', '100');
  return url.href;
}

function parseNextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function parseBody(text: string): unknown {
  // Canvas may prefix JSON with `while(1);` as anti-JSON-hijacking protection.
  const clean = text.replace(/^while\(1\);/, '');
  if (!clean) return null;
  try {
    return JSON.parse(clean);
  } catch {
    return clean;
  }
}

/** GET a Canvas API path, following pagination. Never throws. */
export async function canvasGet(path: string): Promise<CanvasResponse> {
  const start = performance.now();
  let url: string | null = withPerPage(path);
  let pages = 0;
  let status = 0;
  let items: unknown[] | null = null;
  let data: unknown = null;

  try {
    while (url && pages < MAX_PAGES) {
      const res: Response = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      status = res.status;
      pages++;
      const body = parseBody(await res.text());

      if (!res.ok) {
        return {
          path, status, ok: false, ms: Math.round(performance.now() - start),
          pages, count: null, truncated: false, data: body,
          error: `HTTP ${res.status} ${res.statusText}`,
        };
      }

      if (Array.isArray(body)) {
        items = [...(items ?? []), ...body];
        url = parseNextLink(res.headers.get('Link'));
      } else {
        data = body;
        url = null;
      }
    }

    return {
      path, status, ok: true, ms: Math.round(performance.now() - start),
      pages, count: items ? items.length : null, truncated: url !== null,
      data: items ?? data,
    };
  } catch (e) {
    return {
      path, status, ok: false, ms: Math.round(performance.now() - start),
      pages, count: null, truncated: false, data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Run async tasks with at most `limit` in flight, so Canvas doesn't throttle us. */
export async function runPool<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onResult: (result: T) => void,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      const result = await tasks[i]!();
      results[i] = result;
      onResult(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
