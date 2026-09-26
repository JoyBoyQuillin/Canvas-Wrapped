// Wrapped as plain text, for scripts/wrapped-demo.ts. Uses the same slide plan and lines
// as the slide UI, so checking numbers here checks what users will see.

import { CLOCK_ARCHETYPES, DEADLINE_ARCHETYPES } from './archetypes.ts';
import { period, quip, slidePlan, type SlideId } from './wrapped-copy.ts';
import type { WrappedStats } from './wrapped';

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  return `${h}h ${minutes % 60}m`;
}

export function timeAgo(ms: number, now = Date.now()): string {
  const min = Math.round((now - ms) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function lines(id: SlideId, w: WrappedStats): string[] {
  const s = w.submissions;
  const d = w.deadlines;
  const courseLine = (c: WrappedStats['courses'][number]) => `${c.label}${c.term ? ` [${c.term}]` : ''}`;
  switch (id) {
    case 'intro':
      return [
        `Hey ${w.firstName}, this is your Canvas Wrapped: ${w.rangeLabel}.`,
        `${w.terms.map((t) => t.label).join(' + ')}${w.dateRange ? ` · ${fmtDate(w.dateRange.from)} – ${fmtDate(w.dateRange.to)}` : ''}`,
      ];
    case 'quiet':
      return [`Nothing happened ${period(w)}.`];
    case 'hours':
      return [`You spent ${w.totalHours} hours in Canvas.`, `That's about ${Math.round(((w.totalHours ?? 0) / 24) * 10) / 10} full days.`];
    case 'pageviews':
      return [`You opened ${w.clock.totalPageViews.toLocaleString()} Canvas pages ${period(w)}.`];
    case 'courses':
      return [
        'Your top courses:',
        ...w.courses.slice(0, 5).map((c, i) => `  ${i + 1}. ${courseLine(c)} — ${c.hours !== null ? `${c.hours}h` : `${c.pageViews} views`}`),
      ];
    case 'submissions':
      return [`You turned in ${s.total} assignments.`, ...s.byType.map((t) => `  ${t.count} × ${t.label}`)];
    case 'on-time':
      return [
        `On time ${pct(s.onTimeRate)} of the time. ${s.late} late.`,
        `${s.perfectScores} perfect scores, averaging ${s.avgPercent}%.`,
      ];
    case 'deadlines':
      return [
        `Deadline personality: ${DEADLINE_ARCHETYPES[d.archetype].label}.`,
        `You usually submit ${d.medianHoursEarly}h before the deadline.`,
        ...(d.closestCall ? [`Closest call: "${d.closestCall.assignment}" (${d.closestCall.course}), ${fmtDuration(d.closestCall.minutesBefore)} to spare.`] : []),
        ...(d.earliest ? [`Most prepared: "${d.earliest.assignment}" (${d.earliest.course}), ${d.earliest.daysBefore} days early.`] : []),
      ];
    case 'clock':
      return [
        `Study clock: ${CLOCK_ARCHETYPES[w.clock.archetype].label}.`,
        `Peak hour: ${w.clock.peakHour !== null ? fmtHour(w.clock.peakHour) : '—'}. Busiest day: ${w.clock.peakDay}.`,
      ];
    case 'redo':
      return [`Never give up: "${w.redo!.assignment}" (${w.redo!.course}), ${w.redo!.attempts} attempts.`];
    case 'grades':
      return [
        w.gradeMode === 'current' ? 'Your grades right now:' : `Your average on work ${period(w)}:`,
        ...w.courses.filter((c) => c.score !== null).map((c) => `  ${courseLine(c)}: ${c.score}%${c.grade ? ` (${c.grade})` : ''}`),
      ];
    case 'messages':
      return [`Inbox: ${w.messages.threads} conversations, ${w.messages.received} messages. You started ${w.messages.sent}.`];
    case 'recap':
      return [
        `${DEADLINE_ARCHETYPES[d.archetype].label} · ${CLOCK_ARCHETYPES[w.clock.archetype].label}`,
        `${w.totalHours !== null ? `${w.totalHours}h` : `${w.clock.totalPageViews} views`} · ${s.total} submitted · ${pct(s.onTimeRate)} on time`,
      ];
  }
}

/** Wrapped as plain text: one array of lines per slide, ending with its personality line. */
export function wrappedSlides(w: WrappedStats): string[][] {
  return slidePlan(w).map((id) => [...lines(id, w), `  » ${quip(id, w)}`]);
}
