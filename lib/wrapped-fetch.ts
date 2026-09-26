// The only Canvas calls Wrapped needs — the subset of the API test that returned useful data.
// Runs in the content script, same-origin with the logged-in Canvas page.

import { canvasGet, runPool } from './canvas';
import type {
  RawActivity, RawConversation, RawCourse, RawEnrollment, RawGroup, RawSubmission, RawUser, WrappedInput,
} from './wrapped';

const CONCURRENCY = 4;

export interface FetchProgress {
  done: number;
  total: number;
  step: string; // human-readable, shown on the loading screen
}

async function getData<T>(path: string, fallback: T): Promise<T> {
  const res = await canvasGet(path);
  return res.ok ? (res.data as T) : fallback;
}

// Keep only the fields lib/wrapped.ts reads. Canvas responses include assignment
// descriptions, submission bodies, etc. — megabytes we'd otherwise cache on disk.
const trimUser = (u: RawUser): RawUser => ({ id: u.id, name: u.name, short_name: u.short_name });
const trimCourse = (c: RawCourse): RawCourse => ({
  id: c.id, name: c.name, course_code: c.course_code,
  access_restricted_by_date: c.access_restricted_by_date, term: c.term ? { name: c.term.name } : null,
});
const trimEnrollment = (e: RawEnrollment): RawEnrollment => ({
  course_id: e.course_id, total_activity_time: e.total_activity_time,
  grades: { current_score: e.grades?.current_score ?? null, current_grade: e.grades?.current_grade ?? null },
});
const trimSubmission = (s: RawSubmission): RawSubmission => ({
  submitted_at: s.submitted_at, cached_due_date: s.cached_due_date, score: s.score, late: s.late,
  attempt: s.attempt, submission_type: s.submission_type, excused: s.excused,
  assignment: s.assignment && {
    name: s.assignment.name, course_id: s.assignment.course_id, points_possible: s.assignment.points_possible,
  },
});
const trimConversation = (c: RawConversation): RawConversation => ({
  context_code: c.context_code, context_name: c.context_name, message_count: c.message_count,
  last_message_at: c.last_message_at,
});
const trimGroup = (g: RawGroup): RawGroup => ({ course_id: g.course_id, context_name: g.context_name });

export async function fetchWrappedInput(onProgress?: (p: FetchProgress) => void): Promise<WrappedInput> {
  let done = 0;
  let total = 7;
  const track = <T,>(step: string, promise: Promise<T>): Promise<T> =>
    promise.then((value) => {
      onProgress?.({ done: ++done, total, step });
      return value;
    });
  onProgress?.({ done, total, step: 'Saying hi to Canvas' });

  const [user, courses, enrollments, gradedSubmissions, inbox, sent, groups] = await Promise.all([
    track('Checking who you are', getData<RawUser>('/api/v1/users/self', { name: '' })),
    track('Finding your courses', getData<RawCourse[]>('/api/v1/courses?include[]=term&state[]=available&state[]=completed', [])),
    track('Adding up your hours', getData<RawEnrollment[]>('/api/v1/users/self/enrollments?state[]=active&state[]=completed', [])),
    track('Counting every submission', getData<RawSubmission[]>('/api/v1/users/self/graded_submissions?include[]=assignment&only_most_recent=true', [])),
    track('Reading your inbox (just the counts)', getData<RawConversation[]>('/api/v1/conversations', [])),
    track('Checking your sent messages', getData<RawConversation[]>('/api/v1/conversations?scope=sent', [])),
    track('Finding your groups', getData<RawGroup[]>('/api/v1/users/self/groups', [])),
  ]);

  // Per-course analytics 403s for locked past-term courses, so skip those.
  const open = courses.filter((c) => !c.access_restricted_by_date);
  total += open.length;
  const activity: Record<number, RawActivity> = {};
  await runPool(
    open.map((c) => () =>
      track(
        `Mapping your study hours${c.course_code ? ` in ${c.course_code}` : ''}`,
        getData<RawActivity | null>(`/api/v1/courses/${c.id}/analytics/users/self/activity`, null),
      ).then((act) => {
        if (act) activity[c.id] = { page_views: act.page_views ?? {} };
      })),
    CONCURRENCY,
    () => {},
  );

  return {
    user: trimUser(user),
    courses: courses.map(trimCourse),
    enrollments: enrollments.map(trimEnrollment),
    gradedSubmissions: gradedSubmissions.map(trimSubmission),
    inbox: inbox.map(trimConversation),
    sent: sent.map(trimConversation),
    groups: groups.map(trimGroup),
    activity,
  };
}
