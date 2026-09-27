// Detects when a trackpad swipe switches from the fingers moving to the OS momentum "coast".
// wheel-gestures (used by embla-carousel-wheel-gestures) accepts this as `event.momentum`;
// without it, it guesses from how deltas decay, which takes 300ms+ (or never) on Firefox's
// wheel data, so the slide stays glued to the coast. Pure logic, no DOM, so it can be tested
// against recorded swipes.

export interface MomentumDetector {
  /** Feed one horizontal-dominant wheel event; returns whether it's part of the momentum coast. */
  next(deltaX: number, timeStamp: number): boolean;
}

const GESTURE_GAP_MS = 100; // no events for this long = the next event starts a new gesture
const MIN_EVENTS = 6; // don't judge the first few (noisy) events of a gesture
const DECAY_RUN = 3; // this many non-increasing deltas in a row...
const BELOW_PEAK = 0.9; // ...while below 90% of the gesture's peak = coasting
const RISE_FACTOR = 1.3; // while coasting, deltas growing this much...
const RISE_MIN = 6; // ...(and at least this big) twice in a row = fingers pushing again

export function createMomentumDetector(): MomentumDetector {
  let lastTime = -Infinity;
  let count = 0;
  let peak = 0;
  let prev = 0;
  let run = 0;
  let rises = 0;
  let momentum = false;

  const reset = () => {
    count = 0;
    peak = 0;
    prev = 0;
    run = 0;
    rises = 0;
    momentum = false;
  };

  return {
    next(deltaX, timeStamp) {
      if (timeStamp - lastTime > GESTURE_GAP_MS) reset();
      lastTime = timeStamp;
      const abs = Math.abs(deltaX);
      count++;

      if (momentum) {
        const reversed = prev !== 0 && Math.sign(deltaX) !== Math.sign(prev) && abs >= RISE_MIN;
        rises = abs > Math.abs(prev) * RISE_FACTOR && abs >= RISE_MIN ? rises + 1 : 0;
        if (reversed || rises >= 2) {
          reset(); // a new swipe started on top of the coast
          count = 1;
        }
      }

      peak = Math.max(peak, abs);
      run = count > 1 && abs <= Math.abs(prev) ? run + 1 : 0;
      prev = deltaX;
      if (!momentum && count >= MIN_EVENTS && run >= DECAY_RUN && abs <= peak * BELOW_PEAK) momentum = true;
      return momentum;
    },
  };
}
