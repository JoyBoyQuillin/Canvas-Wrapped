// Keeps the raw Wrapped input in extension storage so Wrapped opens instantly.
// Prefetched quietly on Canvas page loads (at most every MAX_AGE_MS); keyed by Canvas
// user id so a different login on the same browser never sees someone else's data.

import { browser } from 'wxt/browser';
import { canvasGet } from './canvas';
import { fetchWrappedInput, type FetchProgress } from './wrapped-fetch';
import type { WrappedInput } from './wrapped';

export const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const VERSION = 1; // bump when WrappedInput's shape changes, so old entries are ignored

export interface CachedWrapped {
  savedAt: number;
  input: WrappedInput;
}

export const isStale = (entry: CachedWrapped) => Date.now() - entry.savedAt > MAX_AGE_MS;

let userId: Promise<number | null> | null = null;
function currentUserId(): Promise<number | null> {
  userId ??= canvasGet('/api/v1/users/self').then((r) => (r.ok ? (r.data as { id?: number }).id ?? null : null));
  return userId;
}

const keyFor = (id: number) => `wrapped:v${VERSION}:${location.host}:${id}`;

export async function readCache(): Promise<CachedWrapped | null> {
  const id = await currentUserId();
  if (id === null) return null;
  try {
    const key = keyFor(id);
    return ((await browser.storage.local.get(key))[key] as CachedWrapped | undefined) ?? null;
  } catch {
    return null; // storage unavailable: behave as if nothing is cached
  }
}

const listeners = new Set<(p: FetchProgress) => void>();
let lastProgress: FetchProgress | null = null;
let inflight: Promise<CachedWrapped> | null = null;

/** Fetch fresh data and save it. Concurrent callers (prefetch + UI) share one fetch. */
export function refreshCache(onProgress?: (p: FetchProgress) => void): Promise<CachedWrapped> {
  if (onProgress) {
    listeners.add(onProgress);
    if (inflight && lastProgress) onProgress(lastProgress);
  }
  inflight ??= (async () => {
    try {
      const input = await fetchWrappedInput((p) => {
        lastProgress = p;
        listeners.forEach((l) => l(p));
      });
      const entry = { savedAt: Date.now(), input };
      const id = input.user.id ?? (await currentUserId());
      if (id != null) await browser.storage.local.set({ [keyFor(id)]: entry }).catch(() => {});
      return entry;
    } finally {
      inflight = null;
      lastProgress = null;
      listeners.clear();
    }
  })();
  return inflight;
}

/** Called on every Canvas page load. Only fetches when logged in and the cache is missing or stale. */
export async function prefetchWrapped(): Promise<void> {
  try {
    if ((await currentUserId()) === null) return;
    const cached = await readCache();
    if (!cached || isStale(cached)) await refreshCache();
  } catch {
    // Background work: never surface errors on the Canvas page.
  }
}
