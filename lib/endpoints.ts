// Every student-accessible Canvas endpoint we want to probe for the API test.
// Some will 401/403 depending on FIU's settings — that's useful to know too.

import { canvasGet, runPool, type CanvasResponse } from './canvas';

export interface Endpoint {
  label: string;
  path: string;
}

export interface ApiResult extends CanvasResponse {
  group: string;
  label: string;
}

const COURSE_INCLUDES = [
  'term', 'total_scores', 'current_grading_period_scores', 'teachers',
  'total_students', 'course_image', 'favorites',
].map((i) => `include[]=${i}`).join('&');

function oneYearAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function globalEndpoints(): Endpoint[] {
  return [
    { label: 'User', path: '/api/v1/users/self' },
    { label: 'Profile', path: '/api/v1/users/self/profile' },
    { label: 'Settings', path: '/api/v1/users/self/settings' },
    { label: 'Custom colors', path: '/api/v1/users/self/colors' },
    { label: 'Avatars', path: '/api/v1/users/self/avatars' },
    { label: 'Enrollments', path: '/api/v1/users/self/enrollments?state[]=active&state[]=completed' },
    { label: 'Courses (default)', path: `/api/v1/courses?${COURSE_INCLUDES}` },
    { label: 'Courses (incl. completed)', path: `/api/v1/courses?${COURSE_INCLUDES}&state[]=available&state[]=completed` },
    { label: 'Favorite courses', path: '/api/v1/users/self/favorites/courses' },
    { label: 'Course nicknames', path: '/api/v1/users/self/course_nicknames' },
    { label: 'To-do', path: '/api/v1/users/self/todo' },
    { label: 'Upcoming events', path: '/api/v1/users/self/upcoming_events' },
    { label: 'Missing submissions', path: '/api/v1/users/self/missing_submissions?include[]=course' },
    { label: 'Graded submissions', path: '/api/v1/users/self/graded_submissions?include[]=assignment&only_most_recent=true' },
    { label: 'Activity stream', path: '/api/v1/users/self/activity_stream' },
    { label: 'Activity stream summary', path: '/api/v1/users/self/activity_stream/summary' },
    { label: 'Groups', path: '/api/v1/users/self/groups' },
    { label: 'Page views', path: '/api/v1/users/self/page_views' },
    { label: 'Communication channels', path: '/api/v1/users/self/communication_channels' },
    { label: 'Files', path: '/api/v1/users/self/files' },
    { label: 'Conversations (inbox)', path: '/api/v1/conversations' },
    { label: 'Conversations (sent)', path: '/api/v1/conversations?scope=sent' },
    { label: 'Planner items (1 yr)', path: `/api/v1/planner/items?start_date=${oneYearAgo()}` },
  ];
}

export function courseEndpoints(id: number): Endpoint[] {
  const c = `/api/v1/courses/${id}`;
  return [
    { label: 'Assignments + submission', path: `${c}/assignments?include[]=submission` },
    { label: 'My submissions', path: `${c}/students/submissions?student_ids[]=self&include[]=assignment&include[]=submission_comments` },
    { label: 'Assignment groups', path: `${c}/assignment_groups?include[]=assignments` },
    { label: 'My enrollment (grades)', path: `${c}/enrollments?user_id=self` },
    { label: 'Discussion topics', path: `${c}/discussion_topics` },
    { label: 'Announcements', path: `/api/v1/announcements?context_codes[]=course_${id}&start_date=${oneYearAgo()}` },
    { label: 'Calendar events', path: `/api/v1/calendar_events?all_events=true&context_codes[]=course_${id}` },
    { label: 'Quizzes', path: `${c}/quizzes` },
    { label: 'Modules', path: `${c}/modules` },
    { label: 'Pages', path: `${c}/pages` },
    { label: 'Files', path: `${c}/files` },
    { label: 'Analytics: activity', path: `${c}/analytics/users/self/activity` },
    { label: 'Analytics: assignments', path: `${c}/analytics/users/self/assignments` },
    { label: 'Analytics: communication', path: `${c}/analytics/users/self/communication` },
  ];
}

interface CourseLike {
  id: number;
  name?: string;
  course_code?: string;
}

function isCourse(x: unknown): x is CourseLike {
  return typeof x === 'object' && x !== null && typeof (x as CourseLike).id === 'number';
}

/** Collect unique courses from every successful course-list result. */
function coursesFrom(results: ApiResult[]): CourseLike[] {
  const byId = new Map<number, CourseLike>();
  for (const r of results) {
    if (!r.ok || !r.label.startsWith('Courses') || !Array.isArray(r.data)) continue;
    for (const c of r.data) if (isCourse(c)) byId.set(c.id, c);
  }
  return [...byId.values()];
}

const CONCURRENCY = 4;

/**
 * Hit every global endpoint, then every per-course endpoint for each course found.
 * `onProgress` fires after each request with the results so far and the known total.
 */
export async function runApiTest(
  onProgress: (results: ApiResult[], total: number) => void,
): Promise<ApiResult[]> {
  const results: ApiResult[] = [];
  const globals = globalEndpoints();
  let total = globals.length;

  const task = (group: string, ep: Endpoint) => async () =>
    ({ group, label: ep.label, ...(await canvasGet(ep.path)) }) as ApiResult;
  const push = (r: ApiResult) => {
    results.push(r);
    onProgress([...results], total);
  };

  await runPool(globals.map((ep) => task('Global', ep)), CONCURRENCY, push);

  const courses = coursesFrom(results);
  const courseTasks = courses.flatMap((course) => {
    const group = `${course.course_code ?? course.name ?? 'Course'} (#${course.id})`;
    return courseEndpoints(course.id).map((ep) => task(group, ep));
  });
  total += courseTasks.length;
  onProgress([...results], total);

  await runPool(courseTasks, CONCURRENCY, push);
  return results;
}
