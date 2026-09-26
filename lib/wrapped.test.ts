import assert from 'node:assert/strict';
import test from 'node:test';

import { computeWrapped } from './wrapped.ts';

test('recent averages ignore excused submissions and handle non-numeric completion states', () => {
  const stats = computeWrapped({
    user: { name: 'Test Student' },
    courses: [{ id: 42, name: 'Econ', course_code: 'ECO1010', term: { name: 'Fall 2026' } }],
    enrollments: [{ course_id: 42, total_activity_time: 0, grades: { current_score: 50, current_grade: 'C' } }],
    gradedSubmissions: [
      {
        submitted_at: '2026-09-01T00:00:00Z',
        cached_due_date: '2026-09-02T00:00:00Z',
        score: 'complete' as any,
        late: false,
        attempt: null,
        submission_type: 'online_text_entry',
        grade: 'complete',
        excused: false,
        assignment: { name: 'Quiz 1', course_id: 42, points_possible: 100 },
      },
      {
        submitted_at: '2026-09-03T00:00:00Z',
        cached_due_date: '2026-09-04T00:00:00Z',
        score: 'incomplete' as any,
        late: false,
        attempt: null,
        submission_type: 'online_text_entry',
        grade: 'incomplete',
        excused: false,
        assignment: { name: 'Quiz 2', course_id: 42, points_possible: 50 },
      },
      {
        submitted_at: '2026-09-05T00:00:00Z',
        cached_due_date: '2026-09-06T00:00:00Z',
        score: null,
        late: false,
        attempt: null,
        submission_type: 'online_text_entry',
        grade: 'EX',
        excused: true,
        assignment: { name: 'Quiz 3', course_id: 42, points_possible: 20 },
      },
    ],
    inbox: [],
    sent: [],
    groups: [],
    activity: { 42: { page_views: {} } },
  }, 'month');

  const course = stats.courses[0]!;
  assert.equal(course.score, 50);
  assert.equal(stats.submissions.avgPercent, 50);
});
