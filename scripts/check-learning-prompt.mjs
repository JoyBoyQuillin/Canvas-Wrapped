import assert from 'node:assert/strict';
import { computeWrapped } from '../lib/wrapped.ts';
import { learningPlanPrompt } from '../lib/learning-plan-prompt.ts';

const empty = computeWrapped({
  user: { name: 'Private Student Name' },
  courses: [], enrollments: [], gradedSubmissions: [], inbox: [], sent: [], groups: [], activity: {},
}, 'week');
const readData = (prompt) => JSON.parse(prompt.split('MY CANVAS WRAPPED DATA\n')[1]);
const emptyPrompt = learningPlanPrompt(empty);
const emptyData = readData(emptyPrompt);
assert.equal(emptyData.submissions.onTimePercent, null);
assert.equal(emptyData.canvasHours, null);
assert.equal(emptyData.courses.length, 0);
assert.ok(!emptyPrompt.includes('Private Student Name'));
assert.match(emptyData.gradeMeaning, /not overall course grades/);

const populated = structuredClone(empty);
populated.rangeLabel = 'All time';
populated.gradeMode = 'current';
populated.submissions.total = 10;
populated.submissions.late = 4;
populated.submissions.onTimeRate = 0.6;
populated.deadlines.medianHoursEarly = -2;
populated.courses = [
  { id: 1, label: 'MAC2311 Calculus I', term: 'Fall 2026', hours: 12, pageViews: 55, submissions: 8, score: 62, grade: 'D' },
  { id: 2, label: 'Unknown grade', term: null, hours: null, pageViews: 0, submissions: 0, score: null, grade: null },
];
const prompt = learningPlanPrompt(populated);
assert.ok(!prompt.includes('[add here]'));
assert.ok(!prompt.includes('MY CONTEXT'));
const data = readData(prompt);
assert.equal(data.timeframe, 'All time');
assert.equal(data.submissions.onTimePercent, 60);
assert.equal(data.submissions.late, 4);
assert.equal(data.medianHoursBeforeDeadline, -2);
assert.equal(data.courses[0].course, 'MAC2311 Calculus I');
assert.equal(data.courses[0].scorePercent, 62);
assert.equal(data.courses[1].scorePercent, null);
assert.match(data.gradeMeaning, /not final grades/);
assert.match(prompt, /do not prove procrastination/);
assert.match(prompt, /two-week plan/);
assert.match(prompt, /do not invent URLs/);
assert.match(prompt, /COURSE RESOURCE GUIDE/);
assert.match(prompt, /cost\/access requirements/);
assert.match(prompt, /verified link or search phrase/);
assert.match(prompt, /recommended resource to use/);
console.log('PASS: Learning prompt preserves course data, missing values, timeframe, and grade meaning.');
