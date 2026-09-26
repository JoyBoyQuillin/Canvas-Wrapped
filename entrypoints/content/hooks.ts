import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { isStale, readCache, refreshCache, type CachedWrapped } from '@/lib/wrapped-cache';
import type { FetchProgress } from '@/lib/wrapped-fetch';

export interface WrappedData {
  entry: CachedWrapped | null;
  loading: boolean; // nothing to show yet
  refreshing: boolean; // showing cached data while fetching fresh
  progress: FetchProgress | null;
  error: string | null;
  refresh: () => void;
}

/**
 * Cached Wrapped input for the UI. Starts when `active` first becomes true: shows the cache
 * instantly if there is one (refreshing it quietly when stale), otherwise loads with progress.
 */
export function useWrappedData(active: boolean): WrappedData {
  const [entry, setEntry] = useState<CachedWrapped | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<FetchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setError(null);
    refreshCache(setProgress)
      .then((fresh) => setEntry(fresh))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
        setProgress(null);
      });
  }, []);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    void readCache().then((cached) => {
      if (cached) {
        setEntry(cached);
        setLoading(false);
        if (isStale(cached)) refresh();
      } else {
        refresh();
      }
    });
  }, [active, refresh]);

  return { entry, loading: loading && !entry, refreshing, progress, error, refresh };
}

/** True after `ms` without pointer or keyboard activity inside `ref`. */
export function useIdle(ref: RefObject<HTMLElement | null>, ms: number, enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setIdle(false);
      return;
    }
    let timer = setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => el.addEventListener(e, wake));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => el.removeEventListener(e, wake));
    };
  }, [ref, ms, enabled]);
  return idle;
}

/** Browser fullscreen for `ref`. Must be toggled from a click (browsers require a user gesture). */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const update = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen().catch(() => {});
  }, [ref]);
  return { isFullscreen, toggle };
}
