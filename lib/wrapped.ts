// Turns raw Canvas API data into Wrapped stats. Pure functions only — no fetching,
// no browser APIs — so it runs the same in the extension and against a JSON dump.
// The raw types list only the fields we read; Canvas sends many more.

import { clockArchetype, deadlineArchetype, type ClockArchetype, type DeadlineArchetype } from './archetypes.ts';

export interface RawUser {
  id?: number;
  name: string;
  short_name?: string;
}

export interface RawCourse {
  id: number;
  name?: string;
  course_code?: string;
  access_restricted_by_date?: boolean;
  term?: { name?: string } | null;
}

export interface RawEnrollment {
  course_id: number;
  total_activity_time: number; // seconds, lifetime — Canvas has no per-day breakdown
  grades?: { current_score?: number | null; current_grade?: string | null };
}

export interface RawSubmission {
  submitted_at: string | null;
  cached_due_date: string | null;
  score: number | string | null;
  late: boolean;
  attempt: number | null;
  submission_type: string | null;
  excused?: boolean | null;
  grade?: string | null;
  workflow_state?: string | null;
  assignment?: { name: string; course_id: number; points_possible: number | null };
}

export interface RawConversation {
  context_code?: string; // "course_123"
  context_name?: string; // "MUH2018 UHB 1265"
  message_count: number;
  last_message_at?: string | null;
}

export interface RawGroup {
  course_id?: number;
  context_name?: string;
}

export interface RawActivity {
  page_views: Record<string, number>; // hourly buckets, keys like "2026-08-24T09:00:00-04:00"
}

export interface WrappedInput {
  user: RawUser;
  courses: RawCourse[];
  enrollments: RawEnrollment[];
  gradedSubmissions: RawSubmission[];
  inbox: RawConversation[];
  sent: RawConversation[];
  groups: RawGroup[];
  activity: Record<number, RawActivity>; // by course id; missing for locked past-term courses
}

/**
 * week / month are rolling windows ending now. semester is the latest *complete* term.
 * all is everything, including incomplete (locked) terms, which appear nowhere else.
 */
export type Range = 'week' | 'month' | 'semester' | 'all';
export const RANGES: Range[] = ['week', 'month', 'semester', 'all'];

export interface Term {
  code: string; // FIU code, e.g. "1268"
  label: string; // "Fall 2026"
  complete: boolean; // every course readable and has activity data
}

export interface CourseStat {
  id: number;
  label: string;
  term: string | null; // "Fall 2026"
  hours: number | null; // null for week/month
  pageViews: number; // within the range; 0 for courses without analytics
  submissions: number; // within the range
  score: number | null; // semester/all: current grade %. week/month: average % on work in range
  grade: string | null; // letter grade; semester/all only
}

export interface NamedSubmission {
  assignment: string;
  course: string;
}

export interface WrappedStats {
  range: Range;
  rangeLabel: string; // "This week", "Fall 2026", ...
  studentName: string;
  firstName: string;
  terms: Term[]; // terms included in this view, oldest first
  dateRange: { from: string; to: string } | null;
  courses: CourseStat[]; // sorted by hours, or page views when hours aren't available
  totalHours: number | null; // null for week/month
  gradeMode: 'current' | 'recent';
  quiet: boolean; // nothing happened in this range
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
    archetype: DeadlineArchetype;
  };
  redo: (NamedSubmission & { attempts: number }) | null;
  clock: {
    totalPageViews: number;
    peakHour: number | null; // 0–23, local to the student's Canvas timezone
    peakDay: string | null;
    archetype: ClockArchetype;
    byHour: number[]; // 24 page-view totals, index = hour
    byDay: number[]; // 7 page-view totals, index 0 = Sunday
  };
  messages: { threads: number; received: number; sent: number };
}

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

// Term codes use FIU's format everywhere: "1265" = 1 + year 26 + 5 (Summer), so they sort
// chronologically. Other schools' "Fall 2026" / "2026 Fall" names are converted to it.
const FIU_TERM_CODE = /\b1(\d\d)([158])\b/;
const TERM_SEASONS: Record<string, string> = { '0': 'Winter', '1': 'Spring', '5': 'Summer', '8': 'Fall' };
const SEASON_DIGITS: Record<string, string> = { winter: '0', spring: '1', summer: '5', fall: '8', autumn: '8' };
const SEASON_YEAR = /\b(winter|spring|summer|fall|autumn)\b\D{0,12}?\b20(\d\d)\b/i;
const YEAR_SEASON = /\b20(\d\d)\b\W{0,3}(winter|spring|summer|fall|autumn)\b/i;
const FIU_COURSE_CODE = /\b[A-Z]{3}\d{4}[A-Z]?\b/;

const DAY_MS = 86_400_000;
const WINDOW_DAYS: Partial<Record<Range, number>> = { week: 7, month: 30 };

/** `fiuCodes`: only trust bare codes like "1268" at FIU; elsewhere "MATH 1998" would parse as a term. */
function termCode(text: string | undefined, fiuCodes: boolean): string | null {
  if (!text) return null;
  const sy = text.match(SEASON_YEAR);
  if (sy) return `1${sy[2]}${SEASON_DIGITS[sy[1]!.toLowerCase()]}`;
  const ys = text.match(YEAR_SEASON);
  if (ys) return `1${ys[1]}${SEASON_DIGITS[ys[2]!.toLowerCase()]}`;
  return fiuCodes ? (text.match(FIU_TERM_CODE)?.[0] ?? null) : null;
}

function termLabel(code: string): string {
  return `${TERM_SEASONS[code[3]!]} 20${code.slice(1, 3)}`;
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
const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

function courseIdOf(c: RawConversation): number | null {
  const id = Number(c.context_code?.replace('course_', ''));
  return id || null;
}

/** Course ids → context names from inbox and groups; the only names locked courses still have. */
function contextNames(input: WrappedInput): Map<number, string> {
  const names = new Map<number, string>();
  for (const c of [...input.inbox, ...input.sent]) {
    const id = courseIdOf(c);
    if (id && c.context_name) names.set(id, c.context_name);
  }
  for (const g of input.groups) {
    if (g.course_id && g.context_name && !names.has(g.course_id)) names.set(g.course_id, g.context_name);
  }
  return names;
}

interface CourseInfo {
  id: number;
  label: string;
  termCode: string | null;
  restricted: boolean;
  hasActivity: boolean;
}

function courseInfo(input: WrappedInput): Map<number, CourseInfo> {
  const context = contextNames(input);
  // FIU's term names start with the code ("1268 - Fall 2026").
  const fiuCodes = input.courses.some((c) => /^1\d\d[158]\b/.test(c.term?.name ?? ''));
  const ids = new Set([...input.courses.map((c) => c.id), ...input.enrollments.map((e) => e.course_id)]);
  const infos = new Map<number, CourseInfo>();
  for (const id of ids) {
    const course = input.courses.find((c) => c.id === id);
    const texts = [course?.course_code, course?.name, context.get(id)].filter((t): t is string => !!t);
    const code = texts.map((t) => t.match(FIU_COURSE_CODE)?.[0]).find(Boolean);
    // FIU puts the readable title ("Python Programming I") in either field; the other holds
    // an SIS string like "COP2047 U02 1268" or "1268 - ENC3249 - ... - Sections RVD & RVF - Fall 2026".
    const title = texts.find(
      (t) => t.length <= 40 && !FIU_COURSE_CODE.test(t) && !(fiuCodes && FIU_TERM_CODE.test(t)),
    );
    infos.set(id, {
      id,
      label: title && code ? `${code} ${title}` : title ?? code ?? texts[0] ?? `Course #${id}`,
      termCode: [course?.term?.name, ...texts].map((t) => termCode(t, fiuCodes)).find(Boolean) ?? null,
      restricted: !!course?.access_restricted_by_date,
      hasActivity: !!input.activity[id],
    });
  }
  return infos;
}

/** A term is complete when none of its courses are locked and at least one has activity data. */
function buildTerms(infos: CourseInfo[]): Term[] {
  const byCode = new Map<string, CourseInfo[]>();
  for (const c of infos) {
    if (c.termCode) byCode.set(c.termCode, [...(byCode.get(c.termCode) ?? []), c]);
  }
  return [...byCode]
    .map(([code, cs]) => ({
      code,
      label: termLabel(code),
      complete: !cs.some((c) => c.restricted) && cs.some((c) => c.hasActivity),
    }))
    .sort((a, b) => Number(a.code) - Number(b.code)); // codes sort chronologically
}

function rangeLabel(range: Range, semester: Term | undefined): string {
  if (range === 'week') return 'This week';
  if (range === 'month') return 'Last 30 days';
  if (range === 'semester') return semester?.label ?? 'This semester';
  return 'All time';
}

export function computeWrapped(input: WrappedInput, range: Range = 'all', now: number = Date.now()): WrappedStats {
  const infos = courseInfo(input);
  const label = (id: number) => infos.get(id)?.label ?? `Course #${id}`;
  const allTerms = buildTerms([...infos.values()]);
  const semester = allTerms.filter((t) => t.complete).at(-1) ?? allTerms.at(-1);
  const completeCodes = new Set(allTerms.filter((t) => t.complete).map((t) => t.code));

  // Which courses this view covers. Incomplete terms only count toward "all".
  const inView = (id: number): boolean => {
    const info = infos.get(id);
    if (range === 'all') return true;
    // No recognizable term names at all: fall back to the courses that are still open.
    if (range === 'semester') return semester ? info?.termCode === semester.code : !info?.restricted;
    return info?.termCode ? completeCodes.has(info.termCode) : !info?.restricted;
  };
  const windowDays = WINDOW_DAYS[range];
  const windowStart = windowDays ? now - windowDays * DAY_MS : null;
  const inWindow = (iso: string | null | undefined): boolean => {
    if (windowStart === null) return true;
    const t = iso ? Date.parse(iso) : NaN;
    return t >= windowStart && t <= now;
  };

  const subs = input.gradedSubmissions.filter(
    (s) => s.submitted_at && !s.excused && inView(s.assignment?.course_id ?? 0) && inWindow(s.submitted_at),
  );

  // Page views: per course, per hour, per weekday. The bucket key's own offset is the
  // student's Canvas timezone, so hour and day are read straight from the string.
  const pageViewsByCourse = new Map<number, number>();
  const hourTotals = new Array<number>(24).fill(0);
  const dayTotals = new Array<number>(7).fill(0);
  for (const [idStr, act] of Object.entries(input.activity)) {
    const id = Number(idStr);
    if (!inView(id)) continue;
    for (const [key, views] of Object.entries(act.page_views)) {
      if (!inWindow(key)) continue;
      pageViewsByCourse.set(id, (pageViewsByCourse.get(id) ?? 0) + views);
      hourTotals[Number(key.slice(11, 13))]! += views;
      dayTotals[new Date(`${key.slice(0, 10)}T12:00:00Z`).getUTCDay()]! += views;
    }
  }
  const totalPageViews = sum(hourTotals);

  const percentOf = (s: RawSubmission): number | null => {
    const pointsPossible = s.assignment?.points_possible;
    const numPoints = Number(pointsPossible);
    if (pointsPossible === null || pointsPossible === undefined || !Number.isFinite(numPoints) || numPoints <= 0) {
      const gradeState = String(s.grade ?? s.workflow_state ?? '').trim().toLowerCase();
      if (gradeState === 'complete' || gradeState === 'checkmark' || gradeState === 'pass' || gradeState === '✓') return 100;
      if (gradeState === 'incomplete' || gradeState === 'missing' || gradeState === 'x' || gradeState === 'not submitted' || gradeState === 'unsubmitted') return 0;
      if (gradeState === 'excused' || gradeState === 'ex' || gradeState === 'not_submitted') return null;
      return null;
    }

    const rawScore = s.score;
    if (rawScore === null || rawScore === undefined) {
      const gradeState = String(s.grade ?? s.workflow_state ?? '').trim().toLowerCase();
      if (gradeState === 'complete' || gradeState === 'checkmark' || gradeState === 'pass' || gradeState === '✓') return 100;
      if (gradeState === 'incomplete' || gradeState === 'missing' || gradeState === 'x' || gradeState === 'not submitted' || gradeState === 'unsubmitted') return 0;
      if (gradeState === 'excused' || gradeState === 'ex' || gradeState === 'not_submitted') return null;
      return null;
    }

    if (typeof rawScore === 'string') {
      const normalized = rawScore.trim().toLowerCase();
      if (normalized === 'complete' || normalized === 'checkmark' || normalized === 'pass' || normalized === '✓') return 100;
      if (normalized === 'incomplete' || normalized === 'missing' || normalized === 'x' || normalized === 'not submitted' || normalized === 'unsubmitted') return 0;
      if (normalized === 'excused' || normalized === 'ex' || normalized === 'not_submitted') return null;
      const numeric = Number(rawScore);
      if (!Number.isFinite(numeric)) return null;
      return (numeric / numPoints) * 100;
    }

    if (!Number.isFinite(rawScore)) return null;
    return (rawScore / numPoints) * 100;
  };

  // Per-course rollup
  const gradeMode = windowDays ? 'recent' : 'current';
  const subsByCourse = new Map<number, RawSubmission[]>();
  for (const s of subs) {
    const id = s.assignment?.course_id ?? 0;
    subsByCourse.set(id, [...(subsByCourse.get(id) ?? []), s]);
  }
  const courses: CourseStat[] = input.enrollments
    .filter((e) => inView(e.course_id))
    .map((e) => {
      const courseSubs = subsByCourse.get(e.course_id) ?? [];
      const recent = courseSubs.map(percentOf).filter((p): p is number => p !== null);
      const termCode = infos.get(e.course_id)?.termCode;
      return {
        id: e.course_id,
        label: label(e.course_id),
        term: termCode ? termLabel(termCode) : null,
        hours: windowDays ? null : round1(e.total_activity_time / 3600),
        pageViews: pageViewsByCourse.get(e.course_id) ?? 0,
        submissions: courseSubs.length,
        score: gradeMode === 'current'
          ? e.grades?.current_score ?? null
          : recent.length ? round1(sum(recent) / recent.length) : null,
        grade: gradeMode === 'current' ? e.grades?.current_grade ?? null : null,
      };
    })
    // In short windows, drop courses with nothing to show.
    .filter((c) => !windowDays || c.pageViews > 0 || c.submissions > 0)
    .sort((a, b) => (b.hours ?? 0) - (a.hours ?? 0) || b.pageViews - a.pageViews || b.submissions - a.submissions);

  // Submissions
  const byType = [...countBy(subs, (s) => SUBMISSION_TYPE_LABELS[s.submission_type ?? ''] ?? 'Other')]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const late = subs.filter((s) => s.late).length;
  const percents = subs.map(percentOf).filter((p): p is number => p !== null);
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

  const peakHour = totalPageViews ? hourTotals.indexOf(Math.max(...hourTotals)) : null;
  const peakDay = totalPageViews ? DAYS[dayTotals.indexOf(Math.max(...dayTotals))]! : null;

  // Messages: in-range by last activity, and tied to a course in view when we know the course.
  const convoInView = (c: RawConversation) => {
    const id = courseIdOf(c);
    return (id === null || !infos.has(id) || inView(id)) && inWindow(c.last_message_at);
  };
  const inbox = input.inbox.filter(convoInView);
  const sent = input.sent.filter(convoInView);

  const viewCodes = new Set(input.enrollments.filter((e) => inView(e.course_id)).map((e) => infos.get(e.course_id)?.termCode));
  const sortedDates = submittedDates.map((d) => d.toISOString()).sort();
  const name = input.user.short_name ?? input.user.name;

  return {
    range,
    rangeLabel: rangeLabel(range, semester),
    studentName: name,
    firstName: name.split(' ')[0] ?? name,
    terms: allTerms.filter((t) => viewCodes.has(t.code)),
    dateRange: windowStart !== null
      ? { from: new Date(windowStart).toISOString(), to: new Date(now).toISOString() }
      : sortedDates.length ? { from: sortedDates[0]!, to: sortedDates.at(-1)! } : null,
    courses,
    totalHours: windowDays ? null : round1(sum(courses.map((c) => c.hours ?? 0))),
    gradeMode,
    quiet: subs.length === 0 && totalPageViews === 0,
    submissions: {
      total: subs.length,
      byType,
      late,
      onTimeRate: subs.length ? (subs.length - late) / subs.length : 1,
      perfectScores: percents.filter((p) => p >= 100).length,
      avgPercent: percents.length ? round1(sum(percents) / percents.length) : null,
      lateNight: submittedDates.filter((d) => d.getHours() < 5).length,
      busiestDay: maxBy([...dayCounts], ([, n]) => n)?.[0] ?? null,
    },
    deadlines: {
      medianHoursEarly: medianHoursEarly === null ? null : round1(medianHoursEarly),
      closestCall: closest && { ...named(closest.s), minutesBefore: Math.round(closest.hoursEarly * 60) },
      earliest: earliest && { ...named(earliest.s), daysBefore: round1(earliest.hoursEarly / 24) },
      archetype: deadlineArchetype(medianHoursEarly),
    },
    redo: redoSub && { ...named(redoSub), attempts: redoSub.attempt! },
    clock: {
      totalPageViews,
      peakHour,
      peakDay,
      archetype: clockArchetype(peakHour),
      byHour: hourTotals,
      byDay: dayTotals,
    },
    messages: {
      threads: inbox.length,
      received: sum(inbox.map((c) => c.message_count)),
      sent: sent.length,
    },
  };
}
