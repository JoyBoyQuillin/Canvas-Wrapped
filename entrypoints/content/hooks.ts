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

// Canvas's school-branded headers: the global nav on wide windows, the top bar on narrow ones.
const CANVAS_HEADERS = ['#header', '.ic-app-header', '#mobile-header', '.mobile-header'];

export interface HeaderColors {
  background: string;
  foreground: string;
}

/** Background of whichever Canvas header is showing, or null if none has a solid color. */
function readHeaderColors(): HeaderColors | null {
  for (const selector of CANVAS_HEADERS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el || el.getClientRects().length === 0) continue; // missing or display:none at this size
    const background = getComputedStyle(el).backgroundColor;
    const [r, g, b, a = 1] = (background.match(/[\d.]+/g) ?? []).map(Number);
    if (r === undefined || g === undefined || b === undefined || a === 0) continue;
    // Relative luminance (sRGB) decides whether white or black text reads better on it.
    const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return { background, foreground: luminance > 0.179 ? '#000' : '#fff' };
  }
  return null;
}

/** The school's header colors, re-read on resize since Canvas swaps headers at its breakpoint. */
export function useCanvasHeaderColors(): HeaderColors | null {
  const [colors, setColors] = useState(readHeaderColors);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setColors((prev) => {
          const next = readHeaderColors();
          return prev?.background === next?.background ? prev : next;
        }),
      );
    };
    update(); // theme CSS may finish loading after the content script starts
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('load', update);
    };
  }, []);
  return colors;
}
