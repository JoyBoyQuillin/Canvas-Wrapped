// Firefox only: re-dispatch trackpad wheel events to the wheel-gestures plugin with a `momentum`
// flag from lib/wheel-momentum.ts. wheel-gestures uses that flag when present; without it, its own
// momentum guess is slow on Firefox's wheel data, so slides lag behind the coast, land short, or
// get dragged a second time by the tail. Chrome doesn't need this and keeps the plugin's defaults.

import { createMomentumDetector } from '@/lib/wheel-momentum';

/** Forward wheel events from `from` (the carousel) to `to` (the plugin's `target`). */
export function forwardWheelWithMomentum(from: HTMLElement, to: HTMLElement): () => void {
  const detector = createMomentumDetector();
  const onWheel = (e: WheelEvent) => {
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? from.clientWidth : 1; // lines/pages → px
    const forwarded = new WheelEvent('wheel', {
      deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ, deltaMode: e.deltaMode,
      clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY,
      // The plugin builds its simulated mousedown from this event's init, and Embla listens for it
      // one level up, so it must bubble (and cross our shadow root) like a real wheel event.
      bubbles: true, cancelable: true, composed: true,
    });
    Object.defineProperty(forwarded, 'momentum', { value: detector.next(e.deltaX * unit, e.timeStamp) });
    to.dispatchEvent(forwarded);
    if (forwarded.defaultPrevented) e.preventDefault();
  };
  from.addEventListener('wheel', onWheel, { passive: false });
  return () => from.removeEventListener('wheel', onWheel);
}
