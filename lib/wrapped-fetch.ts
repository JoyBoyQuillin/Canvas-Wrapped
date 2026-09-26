// The only Canvas calls Wrapped needs — the subset of the API test that returned useful data.
// Runs in the content script, same-origin with the logged-in Canvas page.

import { canvasGet, runPool } from './canvas';
import type { RawActivity, RawCourse, WrappedInput } from './wrapped';

const CONCURRENCY = 4;

async function getData<T>(path: string, fallback: T): Promise<T> {
  const res = await canvasGet(path);
  return res.ok ? (res.data as T) : fallback;
}

export async function fetchWrappedInput(): Promise<WrappedInput> {
  const [user, courses, enrollments, gradedSubmissions, inbox, sent, groups] = await Promise.all([
    getData('/api/v1/users/self', { name: '' }),
    getData<RawCourse[]>('/api/v1/courses?include[]=term&state[]=available&state[]=completed', []),
    getData('/api/v1/users/self/enrollments?state[]=active&state[]=completed', []),
    getData('/api/v1/users/self/graded_submissions?include[]=assignment&only_most_recent=true', []),
    getData('/api/v1/conversations', []),
    getData('/api/v1/conversations?scope=sent', []),
    getData('/api/v1/users/self/groups', []),
  ]);

  // Per-course analytics 403s for locked past-term courses, so skip those.
  const open = courses.filter((c) => !c.access_restricted_by_date);
  const activity: Record<number, RawActivity> = {};
  await runPool(
    open.map((c) => async () => {
      const act = await getData<RawActivity | null>(`/api/v1/courses/${c.id}/analytics/users/self/activity`, null);
      if (act) activity[c.id] = act;
    }),
    CONCURRENCY,
    () => {},
  );

  return { user, courses, enrollments, gradedSubmissions, inbox, sent, groups, activity };
}
