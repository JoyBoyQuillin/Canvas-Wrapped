// Turns raw Canvas API data into Wrapped stats. Pure functions only — no fetching,
// no browser APIs — so it runs the same in the extension and against a JSON dump.
// The raw types list only the fields we read; Canvas sends many more.

export interface RawUser {
  name: string;
  short_name?: string;
}

export interface RawCourse {
  id: number;
  name?: string;
  course_code?: string;
  access_restricted_by_date?: boolean;
}

export interface RawEnrollment {
  course_id: number;
  total_activity_time: number; // seconds
  grades?: { current_score?: number | null; current_grade?: string | null };
}

export interface RawSubmission {
  submitted_at: string | null;
  cached_due_date: string | null;
  score: number | null;
  late: boolean;
  attempt: number | null;
  submission_type: string | null;
  excused?: boolean | null;
  assignment?: { name: string; course_id: number; points_possible: number | null };
}

export interface RawConversation {
  context_code?: string; // "course_123"
  context_name?: string; // "MUH2018 UHB 1265"
  message_count: number;
}

export interface RawGroup {
  course_id?: number;
  context_name?: string;
}

export interface RawActivity {
  page_views: Record<string, number>; // hourly buckets, keys like "2026-08-24T09:00:00-04:00"
  participations: { created_at: string }[];
}

export interface WrappedInput {
  user: RawUser;
  courses: RawCourse[];
  enrollments: RawEnrollment[];
  gradedSubmissions: RawSubmission[];
  inbox: RawConversation[];
  sent: RawConversation[];
  groups: RawGroup[];
  activity: Record<number, RawActivity>; // by course id
}

export interface CourseStat {
  id: number;
  label: string;
  hours: number;
  score: number | null;
  grade: string | null;
  submissions: number;
  pageViews: number;
}

export interface NamedSubmission {
  assignment: string;
  course: string;
}

export interface WrappedStats {
  studentName: string;
  terms: string[];
  dateRange: { from: string; to: string } | null;
  courses: CourseStat[]; // sorted by hours, most first
  totalHours: number;
  submissions: {
    total: number;
    byType: { label: string; count: number }[];
    late: number;
    onTimeRate: number;
    perfectScores: number;
    avgPercent: number | null;
    lateNight: number; // submitted between midnight and 5am
    busiestDay: string | null;
  };
  deadlines: {
    medianHoursEarly: number | null;
    closestCall: (NamedSubmission & { minutesBefore: number }) | null;
    earliest: (NamedSubmission & { daysBefore: number }) | null;
    persona: string;
  };
  redo: (NamedSubmission & { attempts: number }) | null;
  clock: {
    totalPageViews: number;
    peakHour: number | null; // 0–23, local to the student's Canvas timezone
    peakDay: string | null;
    persona: string;
  };
  messages: { threads: number; received: number; sent: number };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  online_quiz: 'Quizzes',
  discussion_topic: 'Discussion posts',
  online_upload: 'File uploads',
  online_text_entry: 'Text entries',
  external_tool: 'External tools (zyBooks etc.)',
  basic_lti_launch: 'External tools (zyBooks etc.)',
  online_url: 'Links',
  media_recording: 'Recordings',
};

// Auto-synced tools (zyBooks) bump `attempt` on every activity, so they'd win "redo" unfairly.
const AUTO_SYNC_TYPES = new Set(['external_tool', 'basic_lti_launch']);
const MIN_REDO_ATTEMPTS = 3; // 2 tries isn't much of a story

// FIU term codes: "1265" = 1 + year 26 + 5 (Summer). 1 = Spring, 5 = Summer, 8 = Fall.
const FIU_TERM_CODE = /\b1(\d\d)([158])\b/;
const TERM_SEASONS: Record<string, string> = { '1': 'Spring', '5': 'Summer', '8': 'Fall' };
const FIU_COURSE_CODE = /\b[A-Z]{3}\d{4}[A-Z]?\b/;

function termFromCode(text: string): string | null {
  const m = text.match(FIU_TERM_CODE);
  return m ? `${TERM_SEASONS[m[2]!]} 20${m[1]}` : null;
}

function maxBy<T>(items: T[], score: (t: T) => number): T | null {
  let best: T | null = null;
  for (const t of items) if (best === null || score(t) > score(best)) best = t;
  return best;
}

function countBy<T>(items: T[], key: (t: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of items) counts.set(key(t), (counts.get(key(t)) ?? 0) + 1);
  return counts;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Best human label per course id. Locked (past-term) courses come back from
 * /courses with no name, so fall back to context names from inbox and groups.
 */
function courseLabels(input: WrappedInput): Map<number, string> {
  const contextNames = new Map<number, string>();
  for (const c of [...input.inbox, ...input.sent]) {
    const id = Number(c.context_code?.replace('course_', ''));
    if (id && c.context_name) contextNames.set(id, c.context_name);
  }
  for (const g of input.groups) {
    if (g.course_id && g.context_name && !contextNames.has(g.course_id)) {
      contextNames.set(g.course_id, g.context_name);
    }
  }

  const ids = new Set([...input.courses.map((c) => c.id), ...input.enrollments.map((e) => e.course_id)]);
  const labels = new Map<number, string>();
  for (const id of ids) {
    const course = input.courses.find((c) => c.id === id);
    const texts = [course?.course_code, course?.name, contextNames.get(id)].filter((t): t is string => !!t);
    const code = texts.map((t) => t.match(FIU_COURSE_CODE)?.[0]).find(Boolean);
    // FIU puts the readable title ("Python Programming I") in either field; the other holds
    // an SIS string like "COP2047 U02 1268" or "1268 - ENC3249 - ... - Sections RVD & RVF - Fall 2026".
    const title = texts.find((t) => t.length <= 40 && !FIU_COURSE_CODE.test(t) && !FIU_TERM_CODE.test(t));
    labels.set(id, title && code ? `${code} ${title}` : title ?? code ?? `Course #${id}`);
  }
  return labels;
}

function termsSeen(input: WrappedInput): string[] {
  const texts = [
    ...input.courses.map((c) => c.name ?? ''),
    ...[...input.inbox, ...input.sent, ...input.groups].map((c) => c.context_name ?? ''),
  ];
  const terms = new Set(texts.map(termFromCode).filter((t): t is string => t !== null));
  // Sort chronologically: year, then season order.
  const order = (t: string) => Number(t.slice(-4)) * 10 + ['Spring', 'Summer', 'Fall'].indexOf(t.split(' ')[0]!);
  return [...terms].sort((a, b) => order(a) - order(b));
}

function deadlinePersona(medianHours: number | null): string {
  if (medianHours === null) return 'Mystery Submitter';
  if (medianHours < 6) return 'Deadline Daredevil';
  if (medianHours < 48) return 'Just-in-Time Finisher';
  return 'Certified Planner';
}

function clockPersona(peakHour: number | null): string {
  if (peakHour === null) return 'Ghost';
  if (peakHour >= 5 && peakHour < 11) return 'Early Bird';
  if (peakHour >= 11 && peakHour < 17) return 'Daytime Grinder';
  if (peakHour >= 17 && peakHour < 22) return 'Evening Scholar';
  return 'Night Owl';
}

export function computeWrapped(input: WrappedInput): WrappedStats {
  const labels = courseLabels(input);
  const label = (id: number) => labels.get(id) ?? `Course #${id}`;
  const subs = input.gradedSubmissions.filter((s) => s.submitted_at && !s.excused);

  // Per-course rollup
  const pageViewsByCourse = new Map<number, number>();
  for (const [id, act] of Object.entries(input.activity)) {
    pageViewsByCourse.set(Number(id), Object.values(act.page_views).reduce((a, b) => a + b, 0));
  }
  const subsByCourse = countBy(subs, (s) => String(s.assignment?.course_id));
  const courses: CourseStat[] = input.enrollments
    .map((e) => ({
      id: e.course_id,
      label: label(e.course_id),
      hours: round1(e.total_activity_time / 3600),
      score: e.grades?.current_score ?? null,
      grade: e.grades?.current_grade ?? null,
      submissions: subsByCourse.get(String(e.course_id)) ?? 0,
      pageViews: pageViewsByCourse.get(e.course_id) ?? 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // Submissions
  const byType = [...countBy(subs, (s) => SUBMISSION_TYPE_LABELS[s.submission_type ?? ''] ?? 'Other')]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const late = subs.filter((s) => s.late).length;
  const percents = subs
    .filter((s) => s.score !== null && s.assignment?.points_possible)
    .map((s) => (s.score! / s.assignment!.points_possible!) * 100);
  const submittedDates = subs.map((s) => new Date(s.submitted_at!));
  const dayCounts = countBy(submittedDates, (d) => DAYS[d.getDay()]!);

  // Deadlines: positive = submitted before the due date
  const timed = subs
    .filter((s) => s.cached_due_date)
    .map((s) => ({
      s,
      hoursEarly: (Date.parse(s.cached_due_date!) - Date.parse(s.submitted_at!)) / 3_600_000,
    }));
  const onTime = timed.filter((t) => t.hoursEarly >= 0);
  const named = (s: RawSubmission): NamedSubmission => ({
    assignment: s.assignment?.name ?? 'Untitled',
    course: label(s.assignment?.course_id ?? 0),
  });
  const closest = maxBy(onTime, (t) => -t.hoursEarly);
  const earliest = maxBy(onTime, (t) => t.hoursEarly);
  const medianHoursEarly = median(timed.map((t) => t.hoursEarly));

  // Redo: most attempts on something the student actually resubmitted by hand
  const redoSub = maxBy(
    subs.filter((s) => !AUTO_SYNC_TYPES.has(s.submission_type ?? '') && (s.attempt ?? 0) >= MIN_REDO_ATTEMPTS),
    (s) => s.attempt ?? 0,
  );

  // Study clock from hourly page-view buckets. The key's own offset is the
  // student's Canvas timezone, so read hour/day straight from the string.
  const hourTotals = new Array<number>(24).fill(0);
  const dayTotals = new Array<number>(7).fill(0);
  for (const act of Object.values(input.activity)) {
    for (const [key, views] of Object.entries(act.page_views)) {
      hourTotals[Number(key.slice(11, 13))]! += views;
      dayTotals[new Date(`${key.slice(0, 10)}T12:00:00Z`).getUTCDay()]! += views;
    }
  }
  const totalPageViews = hourTotals.reduce((a, b) => a + b, 0);
  const peakHour = totalPageViews ? hourTotals.indexOf(Math.max(...hourTotals)) : null;
  const peakDay = totalPageViews ? DAYS[dayTotals.indexOf(Math.max(...dayTotals))]! : null;

  const sortedDates = submittedDates.map((d) => d.toISOString()).sort();

  return {
    studentName: input.user.short_name ?? input.user.name,
    terms: termsSeen(input),
    dateRange: sortedDates.length ? { from: sortedDates[0]!, to: sortedDates.at(-1)! } : null,
    courses,
    totalHours: round1(courses.reduce((a, c) => a + c.hours, 0)),
    submissions: {
      total: subs.length,
      byType,
      late,
      onTimeRate: subs.length ? (subs.length - late) / subs.length : 1,
      perfectScores: percents.filter((p) => p >= 100).length,
      avgPercent: percents.length ? round1(percents.reduce((a, b) => a + b, 0) / percents.length) : null,
      lateNight: submittedDates.filter((d) => d.getHours() < 5).length,
      busiestDay: maxBy([...dayCounts], ([, n]) => n)?.[0] ?? null,
    },
    deadlines: {
      medianHoursEarly: medianHoursEarly === null ? null : round1(medianHoursEarly),
      closestCall: closest && { ...named(closest.s), minutesBefore: Math.round(closest.hoursEarly * 60) },
      earliest: earliest && { ...named(earliest.s), daysBefore: round1(earliest.hoursEarly / 24) },
      persona: deadlinePersona(medianHoursEarly),
    },
    redo: redoSub && { ...named(redoSub), attempts: redoSub.attempt! },
    clock: { totalPageViews, peakHour, peakDay, persona: clockPersona(peakHour) },
    messages: {
      threads: input.inbox.length,
      received: input.inbox.reduce((a, c) => a + c.message_count, 0),
      sent: input.sent.length,
    },
  };
}
