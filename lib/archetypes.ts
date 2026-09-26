// Archetype rules, labels, and lines — the one place to rename or retune them.
// Ids are stable (visuals and themes key off them); labels and lines are free to change.
// See docs/archetypes.md for the flowcharts.

export type DeadlineArchetype = 'mystery' | 'daredevil' | 'just-in-time' | 'planner';
export type ClockArchetype = 'ghost' | 'early-bird' | 'daytime' | 'evening' | 'night-owl';

export interface ArchetypeInfo {
  label: string;
  lines: string[]; // one is picked per student, shown under the label
}

/** Median hours between submitting and the due date. Negative = late. */
export function deadlineArchetype(medianHoursEarly: number | null): DeadlineArchetype {
  if (medianHoursEarly === null) return 'mystery';
  if (medianHoursEarly < 6) return 'daredevil';
  if (medianHoursEarly < 48) return 'just-in-time';
  return 'planner';
}

/** Hour of day (0–23) with the most Canvas page views. */
export function clockArchetype(peakHour: number | null): ClockArchetype {
  if (peakHour === null) return 'ghost';
  if (peakHour >= 5 && peakHour < 11) return 'early-bird';
  if (peakHour >= 11 && peakHour < 17) return 'daytime';
  if (peakHour >= 17 && peakHour < 22) return 'evening';
  return 'night-owl';
}

export const DEADLINE_ARCHETYPES: Record<DeadlineArchetype, ArchetypeInfo> = {
  mystery: {
    label: 'Mystery Submitter',
    lines: ['No deadlines to judge you by. Suspicious.', 'Your submission habits remain classified.'],
  },
  daredevil: {
    label: 'Deadline Daredevil',
    lines: [
      'Pressure makes diamonds, and you are very, very shiny.',
      'The deadline is a finish line and you love a photo finish.',
      "Why submit early when 11:58pm exists?",
    ],
  },
  'just-in-time': {
    label: 'Just-in-Time Finisher',
    lines: [
      'Not too early, not too late. Perfectly calibrated.',
      'You treat deadlines like a train schedule and you never miss the train.',
      'Cutting it close, but never too close.',
    ],
  },
  planner: {
    label: 'Certified Planner',
    lines: [
      'Your future self sends their thanks.',
      "Deadlines fear you. They've never even seen you coming.",
      'Days early. Every time. Who hurt you?',
    ],
  },
};

export const CLOCK_ARCHETYPES: Record<ClockArchetype, ArchetypeInfo> = {
  ghost: {
    label: 'Ghost',
    lines: ["Canvas barely knows you were here. Spooky.", 'In and out. No trace.'],
  },
  'early-bird': {
    label: 'Early Bird',
    lines: ['Coffee, Canvas, conquer.', "You've done more before 10am than most do all day."],
  },
  daytime: {
    label: 'Daytime Grinder',
    lines: ['Business hours, business results.', 'Sunlight is your study lamp.'],
  },
  evening: {
    label: 'Evening Scholar',
    lines: ['Dinner, then destiny.', 'Golden hour is your study hour.'],
  },
  'night-owl': {
    label: 'Night Owl',
    lines: ['The moon has seen things. Mostly your Canvas tab.', 'Sleep is for people without assignments.'],
  },
};
