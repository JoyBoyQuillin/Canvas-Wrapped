// Prints a text-only Wrapped from an API-test dump, to check the numbers before building UI.
// Usage: node scripts/wrapped-demo.ts [path/to/canvas-dump.json] [--range=week|month|semester|all] [--json]
// Ranges are measured from when the dump was taken, not from today.

import { readFileSync, readdirSync } from 'node:fs';
import { computeWrapped, RANGES, type Range, type WrappedInput } from '../lib/wrapped.ts';
import { wrappedSlides } from '../lib/wrapped-slides.ts';

interface DumpResult {
  group: string;
  label: string;
  path: string;
  ok: boolean;
  data: unknown;
}

function latestDump(): string {
  const files = readdirSync('test_data').filter((f) => f.startsWith('canvas-dump-')).sort();
  if (!files.length) throw new Error('No canvas-dump-*.json in test_data/ — run the API test panel first.');
  return `test_data/${files.at(-1)}`;
}

/** Rebuild the input fetchWrappedInput() would return, from the API test's results. */
function inputFromDump(results: DumpResult[]): WrappedInput {
  const global = (label: string) => results.find((r) => r.group === 'Global' && r.label === label && r.ok)?.data;
  const activity: WrappedInput['activity'] = {};
  for (const r of results) {
    const id = r.path.match(/courses\/(\d+)\/analytics\/users\/self\/activity/)?.[1];
    if (id && r.ok) activity[Number(id)] = r.data as WrappedInput['activity'][number];
  }
  return {
    user: global('User') as WrappedInput['user'],
    courses: (global('Courses (incl. completed)') ?? []) as WrappedInput['courses'],
    enrollments: (global('Enrollments') ?? []) as WrappedInput['enrollments'],
    gradedSubmissions: (global('Graded submissions') ?? []) as WrappedInput['gradedSubmissions'],
    inbox: (global('Conversations (inbox)') ?? []) as WrappedInput['inbox'],
    sent: (global('Conversations (sent)') ?? []) as WrappedInput['sent'],
    groups: (global('Groups') ?? []) as WrappedInput['groups'],
    activity,
  };
}

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith('--')) ?? latestDump();
const range = (args.find((a) => a.startsWith('--range='))?.slice(8) ?? 'all') as Range;
if (!RANGES.includes(range)) throw new Error(`--range must be one of ${RANGES.join(', ')}`);
const dump = JSON.parse(readFileSync(path, 'utf8')) as { fetchedAt: string; results: DumpResult[] };
const stats = computeWrapped(inputFromDump(dump.results), range, Date.parse(dump.fetchedAt));

console.log(`(from ${path}, range: ${range})\n`);
wrappedSlides(stats).forEach((lines, i) => {
  console.log(`── Slide ${i + 1} ${'─'.repeat(40)}`);
  console.log(lines.join('\n'), '\n');
});

if (process.argv.includes('--json')) console.log(JSON.stringify(stats, null, 2));
