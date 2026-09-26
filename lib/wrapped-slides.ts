// Slide content shared by the in-page card carousel and scripts/wrapped-demo.ts.

import type { WrappedStats } from './wrapped';

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = Math.floor(minutes / 60);
  return `${h}h ${minutes % 60}m`;
}

/** Wrapped as plain text: one array of lines per slide. */
export function wrappedSlides(w: WrappedStats): string[][] {
  const top = w.courses[0];
  const topGrade = [...w.courses].filter((c) => c.score !== null).sort((a, b) => b.score! - a.score!)[0];
  const s = w.submissions;
  const d = w.deadlines;

  return [
    [
      `Hey ${w.studentName}, this is your Canvas Wrapped.`,
      `${w.terms.join(' + ')}${w.dateRange ? ` · ${fmtDate(w.dateRange.from)} – ${fmtDate(w.dateRange.to)}` : ''}`,
    ],
    [
      `You spent ${w.totalHours} hours in Canvas.`,
      `That's about ${Math.round(w.totalHours / 24 * 10) / 10} full days.`,
    ],
    [
      'Your top courses by time:',
      ...w.courses.slice(0, 5).map((c, i) => `  ${i + 1}. ${c.label} — ${c.hours}h`),
      ...(top ? [`${top.label} had your heart.`] : []),
    ],
    [
      `You turned in ${s.total} assignments.`,
      ...s.byType.map((t) => `  ${t.count} × ${t.label}`),
    ],
    [
      `On time ${pct(s.onTimeRate)} of the time. Only ${s.late} late.`,
      `You nailed ${s.perfectScores} perfect scores, averaging ${s.avgPercent}% across graded work.`,
    ],
    [
      `Your deadline personality: ${d.persona}.`,
      ...(d.medianHoursEarly !== null ? [`You usually submit ${d.medianHoursEarly}h before the deadline.`] : []),
      ...(d.closestCall
        ? [`Closest call: "${d.closestCall.assignment}" (${d.closestCall.course}), ${fmtDuration(d.closestCall.minutesBefore)} to spare.`]
        : []),
      ...(d.earliest
        ? [`Most prepared: "${d.earliest.assignment}" (${d.earliest.course}), ${d.earliest.daysBefore} days early.`]
        : []),
    ],
    [
      `Your study clock says: ${w.clock.persona}.`,
      ...(w.clock.peakHour !== null ? [`Peak Canvas hour: ${fmtHour(w.clock.peakHour)}. Busiest day: ${w.clock.peakDay}.`] : []),
      `${w.clock.totalPageViews.toLocaleString()} page views in your current courses.`,
      `${s.lateNight} ${s.lateNight === 1 ? 'submission' : 'submissions'} between midnight and 5am.${s.busiestDay ? ` Most turned in on ${s.busiestDay}s.` : ''}`,
    ],
    ...(w.redo
      ? [[
        `Never give up award: "${w.redo.assignment}" (${w.redo.course})`,
        `${w.redo.attempts} attempts.`,
      ]]
      : []),
    [
      'Your grades right now:',
      ...w.courses.filter((c) => c.score !== null).map((c) => `  ${c.label}: ${c.score}%${c.grade ? ` (${c.grade})` : ''}`),
      ...(topGrade ? [`Top of the class (yours, anyway): ${topGrade.label}.`] : []),
    ],
    [
      `Inbox: ${w.messages.threads} conversations, ${w.messages.received} messages.`,
      `You started ${w.messages.sent} conversations yourself.`,
    ],
  ];
}
