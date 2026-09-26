// Which slides a Wrapped has, and the personality line on each one.
// Shared by the slide UI (components/wrapped/slides.tsx) and the text demo (lib/wrapped-slides.ts).

import { CLOCK_ARCHETYPES, DEADLINE_ARCHETYPES } from './archetypes.ts';
import type { WrappedStats } from './wrapped';

export type SlideId =
  | 'intro' | 'quiet' | 'hours' | 'pageviews' | 'courses' | 'submissions' | 'on-time'
  | 'deadlines' | 'clock' | 'redo' | 'grades' | 'messages' | 'recap';

/** Slides to show, in order. Anything without data for this range is skipped. */
export function slidePlan(w: WrappedStats): SlideId[] {
  if (w.quiet) return ['intro', 'quiet'];
  const plan: SlideId[] = ['intro'];
  if (w.totalHours !== null) plan.push('hours');
  else if (w.clock.totalPageViews > 0) plan.push('pageviews');
  if (w.courses.length) plan.push('courses');
  if (w.submissions.total) plan.push('submissions', 'on-time');
  if (w.deadlines.medianHoursEarly !== null) plan.push('deadlines');
  if (w.clock.totalPageViews > 0) plan.push('clock');
  if (w.redo) plan.push('redo');
  if (w.courses.some((c) => c.score !== null)) plan.push('grades');
  if (w.messages.threads || w.messages.sent) plan.push('messages');
  plan.push('recap');
  return plan;
}

/** "this week", "this semester"... for dropping into sentences. */
export function period(w: WrappedStats): string {
  return { week: 'this week', month: 'in the last 30 days', semester: 'this semester', all: 'so far' }[w.range];
}

// Stable pick: the same student + range + slide always gets the same line, so it
// doesn't reshuffle on re-render, but different slides and students get variety.
function pick(lines: string[], seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return lines[(h >>> 0) % lines.length]!;
}

export function quip(id: SlideId, w: WrappedStats): string {
  const p = (lines: string[]) => pick(lines, `${w.studentName}|${w.range}|${id}`);
  const s = w.submissions;
  const top = w.courses[0];

  switch (id) {
    case 'intro':
      return p({
        week: ['Seven days. Let’s see what you did with them.', 'A week in the life.'],
        month: ['Thirty days of you, condensed.', 'Your month, the highlight reel.'],
        semester: ['Grab a snack. This is your semester.', 'Every click, every deadline, every late night.'],
        all: ['Everything Canvas knows about you. The good parts.', 'The whole story, so far.'],
      }[w.range]);

    case 'quiet':
      return p(['Nothing to see here. Rest is productive too.', 'A quiet stretch. Your future self is well-rested.']);

    case 'hours': {
      const h = w.totalHours ?? 0;
      if (h >= 100) return p(['Canvas should honestly be paying you rent.', "That's basically a part-time job."]);
      if (h >= 40) return p(["That's a full work week. Respect.", 'Solid. Consistent. Slightly concerning.']);
      if (h >= 10) return p(['In, out, done. Efficient.', 'Quality over quantity.']);
      return p(['Speedrun strats.', 'Minimal time, maximum results. Allegedly.']);
    }

    case 'pageviews': {
      const v = w.clock.totalPageViews;
      if (v >= 500) return p(['You basically live here now.', 'Your browser has Canvas on speed dial.']);
      if (v >= 100) return p(['Checking in like a responsible adult.', 'Steady visits. Canvas appreciates you.']);
      return p(['Just popping in.', 'A light touch.']);
    }

    case 'courses': {
      const share = top && w.courses.length > 1
        ? (top.hours ?? top.pageViews) / w.courses.reduce((a, c) => a + (c.hours ?? c.pageViews), 0)
        : 1;
      if (share >= 0.4) return p([`${top?.label} got the lion's share.`, "You definitely have a favorite. We won't tell."]);
      return p(['Spreading the love evenly. Very diplomatic.', 'No favorites here. Allegedly.']);
    }

    case 'submissions':
      if (s.total >= 100) return p(["That's a lot of Submit buttons.", 'Your Submit button needs a vacation.']);
      if (s.total >= 20) return p(['Steady output. Machine-like, even.', 'Keep the streak alive.']);
      return p(['Every one counts.', 'Small but mighty.']);

    case 'on-time':
      if (s.late === 0) return p(['A perfect record. Not a single late one.', 'Zero late. Frame this slide.']);
      if (s.onTimeRate >= 0.95) return p(['Your professors could set their watches by you.', 'Reliable is an understatement.']);
      if (s.onTimeRate >= 0.8) return p(['Mostly on time, occasionally fashionably late.', 'Pretty solid. Nobody’s perfect.']);
      return p(['Deadlines are more of a suggestion, right?', 'Hey, you got them in. That’s what counts.']);

    case 'deadlines':
      return p(DEADLINE_ARCHETYPES[w.deadlines.archetype].lines);

    case 'clock':
      return p(CLOCK_ARCHETYPES[w.clock.archetype].lines);

    case 'redo':
      if ((w.redo?.attempts ?? 0) >= 5) return p(['Persistence unlocked.', 'Main character energy.']);
      return p(['Third time’s the charm.', 'You kept going until you got it.']);

    case 'grades': {
      const best = Math.max(...w.courses.map((c) => c.score ?? 0));
      if (best >= 97) return p(['Honor roll energy.', 'Frame these. Send them to your family group chat.']);
      if (best >= 90) return p(['Strong numbers across the board.', 'Your GPA says thank you.']);
      return p(["Every grade is a story, and yours isn't over.", 'Room to grow is still room to glow.']);
    }

    case 'messages':
      if (w.messages.sent === 0) return p(['The strong, silent type.', 'Reading everything, replying to nothing. Iconic.']);
      if (w.messages.received >= 50) return p(['Popular inbox.', 'Your inbox is busier than your group chat.']);
      return p(['Keeping the lines open.', 'Communication is key. You get it.']);

    case 'recap':
      return p({
        week: ['Same time next week?', 'One week down.'],
        month: ['See you next month.', "That's a month well spent."],
        semester: ['See you next semester.', 'On to the next one.'],
        all: ["That's a wrap. For now.", 'To be continued.'],
      }[w.range]);
  }
}
