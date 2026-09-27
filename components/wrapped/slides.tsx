import type { ReactNode } from 'react';
import WhatsNext from './WhatsNext';
import { cn } from '@/lib/utils';
import { CLOCK_ARCHETYPES, DEADLINE_ARCHETYPES } from '@/lib/archetypes';
import { DAYS, type WrappedStats } from '@/lib/wrapped';
import { period, quip, slidePlan, type SlideId } from '@/lib/wrapped-copy';
import { fmtDate, fmtDuration, fmtHour, pct } from '@/lib/wrapped-slides';
import {
  Bubbles, CLOCK_THEME, ClockArt, DEADLINE_THEME, DeadlineArt, Donut, GradeRing, LiveBars, QuietArt,
  RepeatArt, StackedBar, TrophyArt, Waffle,
} from './art';
import { BarList, BigStat, Callout, Headline, MiniStat, Slide, Sub, Tag, Title } from './primitives';

export interface SlideDef {
  id: SlideId;
  title: string; // for screen readers and the slide counter
  content: ReactNode;
  data: unknown; // the numbers behind this slide, for "Stats for nerds"
}

function StudyClock({ byHour, peakHour }: { byHour: number[]; peakHour: number | null }) {
  const max = Math.max(...byHour, 1);
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-28 items-end gap-[3px] @4xl/slide:h-44 @4xl/slide:gap-1.5" aria-hidden>
        {byHour.map((views, hour) => (
          <div
            key={hour}
            className={cn('flex-1 rounded-t-sm', hour === peakHour ? 'bg-white' : 'bg-white/35')}
            style={{ height: `${Math.max((views / max) * 100, 2)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/60 @4xl/slide:text-sm" aria-hidden>
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
      </div>
      <figcaption className="sr-only">Canvas page views by hour of day, peaking at {peakHour === null ? 'no hour' : fmtHour(peakHour)}.</figcaption>
    </figure>
  );
}

function DayStrip({ byDay }: { byDay: number[] }) {
  const max = Math.max(...byDay, 1);
  return (
    <div className="grid max-w-md grid-cols-7 gap-2" aria-hidden>
      {byDay.map((views, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="aspect-square w-full max-w-10 rounded-md bg-white" style={{ opacity: 0.15 + (views / max) * 0.85 }} />
          <span className="text-xs text-white/60 @4xl/slide:text-sm">{DAYS[i]!.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}

export function buildSlides(w: WrappedStats): SlideDef[] {
  const s = w.submissions;
  const d = w.deadlines;
  const top = w.courses[0];
  const graded = w.courses.filter((c) => c.score !== null).sort((a, b) => b.score! - a.score!);
  const deadline = DEADLINE_ARCHETYPES[d.archetype];
  const clock = CLOCK_ARCHETYPES[w.clock.archetype];
  const multiTerm = w.terms.length > 1; // only tag courses when the view spans semesters
  const q = (id: SlideId) => quip(id, w);

  const build: Record<SlideId, () => Omit<SlideDef, 'id'>> = {
    intro: () => ({
      title: 'Welcome',
      data: { range: w.range, terms: w.terms, dateRange: w.dateRange },
      content: (
        <Slide
          theme="violet"
          eyebrow={`Canvas Wrapped · ${w.rangeLabel}`}
          showArtOnSmall
          art={<LiveBars className="h-24 w-full max-w-72 @4xl/slide:h-44 @4xl/slide:w-72" />}
          quip={q('intro')}
        >
          <p className="text-lg font-medium text-white/80 @4xl/slide:text-3xl">Hey {w.firstName},</p>
          <h2 className="text-5xl leading-[1.05] font-black tracking-tight @4xl/slide:text-9xl">
            {w.range === 'week' ? 'Your week,' : w.range === 'month' ? 'Your month,' : w.range === 'semester' ? 'Your semester,' : 'Your Canvas,'}
            <br />wrapped.
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {w.terms.map((t) => <Tag key={t.code}>{t.label}</Tag>)}
            {w.dateRange && <span className="text-sm text-white/70 @4xl/slide:text-lg">{fmtDate(w.dateRange.from)} – {fmtDate(w.dateRange.to)}</span>}
          </div>
        </Slide>
      ),
    }),

    quiet: () => ({
      title: 'A quiet stretch',
      data: { range: w.range },
      content: (
        <Slide theme="night" eyebrow="Nothing to report" art={<QuietArt />} quip={q('quiet')} footer={<WhatsNext stats={w} />}>
          <Title>A quiet {w.range === 'week' ? 'week' : 'stretch'}.</Title>
          <Sub>No submissions or Canvas activity {period(w)}. Try a longer view up top.</Sub>
        </Slide>
      ),
    }),

    hours: () => ({
      title: 'Time in Canvas',
      data: { totalHours: w.totalHours, byCourse: w.courses.map((c) => ({ course: c.label, hours: c.hours })) },
      content: (
        <Slide theme="emerald" eyebrow="Time in Canvas" quip={q('hours')}>
          <Headline>You spent</Headline>
          <BigStat value={w.totalHours} unit="hours" />
          <Sub>in Canvas. That's about {Math.round(((w.totalHours ?? 0) / 24) * 10) / 10} full days.</Sub>
          <Waffle hours={w.totalHours ?? 0} />
        </Slide>
      ),
    }),

    pageviews: () => ({
      title: 'Canvas visits',
      data: { totalPageViews: w.clock.totalPageViews, byDay: w.clock.byDay },
      content: (
        <Slide theme="emerald" eyebrow="Canvas visits" quip={q('pageviews')}>
          <Headline>You opened</Headline>
          <BigStat value={w.clock.totalPageViews.toLocaleString()} unit="pages" />
          <Sub>in Canvas {period(w)}, across your current courses.</Sub>
          <DayStrip byDay={w.clock.byDay} />
        </Slide>
      ),
    }),

    courses: () => ({
      title: 'Top courses',
      data: w.courses,
      content: (
        <Slide theme="fuchsia" eyebrow="Top courses" art={<TrophyArt />} quip={q('courses')}>
          <Headline>{top!.label} had your heart.</Headline>
          <BarList
            ranked
            items={w.courses.slice(0, 5).map((c) => ({
              label: c.label,
              value: c.hours ?? c.pageViews,
              display: c.hours !== null ? `${c.hours}h` : `${c.pageViews} views`,
              tag: multiTerm ? c.term : null,
            }))}
          />
        </Slide>
      ),
    }),

    submissions: () => ({
      title: 'Submissions',
      data: { total: s.total, byType: s.byType },
      content: (
        <Slide theme="orange" eyebrow="Submissions" quip={q('submissions')}>
          <Headline>You turned in</Headline>
          <BigStat value={s.total} unit={s.total === 1 ? 'assignment' : 'assignments'} />
          <StackedBar items={s.byType.slice(0, 6)} />
        </Slide>
      ),
    }),

    'on-time': () => ({
      title: 'On time',
      data: { onTimeRate: s.onTimeRate, late: s.late, perfectScores: s.perfectScores, avgPercent: s.avgPercent, lateNight: s.lateNight },
      content: (
        <Slide theme="sky" eyebrow="Reliability" art={<Donut value={s.onTimeRate} label={pct(s.onTimeRate)} className="size-64 @5xl/slide:size-80 [&_span]:text-6xl" />} quip={q('on-time')}>
          <div className="flex items-center gap-6">
            <Donut value={s.onTimeRate} label={pct(s.onTimeRate)} className="@4xl/slide:hidden" />
            <div className="flex flex-col gap-1">
              <Headline>On time, {pct(s.onTimeRate)} of the time.</Headline>
              <Sub>{s.late === 0 ? 'Not a single late submission.' : `Only ${s.late} late ${s.late === 1 ? 'submission' : 'submissions'} ${period(w)}.`}</Sub>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Perfect scores" value={s.perfectScores} />
            <MiniStat label="Average" value={s.avgPercent === null ? '—' : `${s.avgPercent}%`} />
            <MiniStat label="After midnight" value={s.lateNight} />
          </div>
        </Slide>
      ),
    }),

    deadlines: () => ({
      title: 'Deadline personality',
      data: d,
      content: (
        <Slide theme={DEADLINE_THEME[d.archetype]} eyebrow="Deadline personality" art={<DeadlineArt archetype={d.archetype} />} quip={q('deadlines')}>
          <Title>{deadline.label}</Title>
          {d.medianHoursEarly !== null && (
            <Sub>
              {d.medianHoursEarly >= 0
                ? `You usually submit ${d.medianHoursEarly >= 48 ? `${Math.round(d.medianHoursEarly / 24)} days` : `${d.medianHoursEarly}h`} before the deadline.`
                : `You usually submit ${Math.abs(d.medianHoursEarly)}h after the deadline.`}
            </Sub>
          )}
          <div className="grid gap-3 @4xl/slide:grid-cols-2">
            {d.closestCall && (
              <Callout label="Closest call" title={d.closestCall.assignment} detail={`${d.closestCall.course} · ${fmtDuration(d.closestCall.minutesBefore)} to spare`} />
            )}
            {d.earliest && (
              <Callout label="Most prepared" title={d.earliest.assignment} detail={`${d.earliest.course} · ${d.earliest.daysBefore} days early`} />
            )}
          </div>
        </Slide>
      ),
    }),

    clock: () => ({
      title: 'Study clock',
      data: w.clock,
      content: (
        <Slide theme={CLOCK_THEME[w.clock.archetype]} eyebrow="Study clock" art={<ClockArt archetype={w.clock.archetype} />} quip={q('clock')}>
          <Title>{clock.label}</Title>
          <Sub>
            Peak Canvas hour: <strong className="text-white">{w.clock.peakHour !== null && fmtHour(w.clock.peakHour)}</strong>.
            Busiest day: <strong className="text-white">{w.clock.peakDay}</strong>.
          </Sub>
          <StudyClock byHour={w.clock.byHour} peakHour={w.clock.peakHour} />
        </Slide>
      ),
    }),

    redo: () => ({
      title: 'Never give up',
      data: w.redo,
      content: (
        <Slide theme="amber" eyebrow="Never give up award" art={<RepeatArt />} quip={q('redo')}>
          <BigStat value={w.redo!.attempts} unit="attempts" />
          <Headline>{w.redo!.assignment}</Headline>
          <Sub>{w.redo!.course}</Sub>
        </Slide>
      ),
    }),

    grades: () => ({
      title: 'Grades',
      data: { mode: w.gradeMode, courses: graded.map((c) => ({ course: c.label, term: c.term, score: c.score, grade: c.grade })) },
      content: (
        <Slide theme="green" eyebrow={w.gradeMode === 'current' ? 'Report card' : `Scores ${period(w)}`} quip={q('grades')}>
          <Headline>
            {w.gradeMode === 'current'
              ? <>Top of the class (yours, anyway): {graded[0]!.label}.</>
              : <>Your best work {period(w)}: {graded[0]!.label}.</>}
          </Headline>
          <div className="grid grid-cols-3 gap-4 @4xl/slide:flex @4xl/slide:flex-wrap @4xl/slide:gap-10 @4xl/slide:[&>*]:w-40">
            {graded.slice(0, 6).map((c) => (
              <GradeRing key={c.id} score={c.score!} grade={c.grade} label={c.label} tag={multiTerm ? c.term : null} />
            ))}
          </div>
        </Slide>
      ),
    }),

    messages: () => ({
      title: 'Inbox',
      data: w.messages,
      content: (
        <Slide theme="cyan" eyebrow="Inbox" art={<Bubbles count={w.messages.threads} />} quip={q('messages')}>
          <BigStat value={w.messages.received} unit={w.messages.received === 1 ? 'message' : 'messages'} />
          <Sub>
            across {w.messages.threads} {w.messages.threads === 1 ? 'conversation' : 'conversations'} {period(w)}.
            You started {w.messages.sent} of them yourself.
          </Sub>
          <div className="@4xl/slide:hidden"><Bubbles count={w.messages.threads} /></div>
        </Slide>
      ),
    }),

    recap: () => ({
      title: 'Recap',
      data: w,
      content: (
        <Slide theme="finale" eyebrow={`Your Wrapped · ${w.rangeLabel}`} quip={q('recap')} footer={<WhatsNext stats={w} />}>
          <Headline>That's a wrap, {w.firstName}.</Headline>
          <div className="grid grid-cols-2 gap-3 @xl/slide:grid-cols-3 @4xl/slide:gap-4">
            {w.totalHours !== null
              ? <MiniStat label="Hours" value={w.totalHours} />
              : <MiniStat label="Pages opened" value={w.clock.totalPageViews.toLocaleString()} />}
            <MiniStat label="Submitted" value={s.total} />
            <MiniStat label="On time" value={pct(s.onTimeRate)} />
            <MiniStat label="Top course" value={top?.label ?? '—'} />
            <MiniStat label="Deadlines" value={deadline.label} />
            <MiniStat label="Study clock" value={clock.label} />
          </div>
        </Slide>
      ),
    }),
  };

  return slidePlan(w).map((id) => ({ id, ...build[id]() }));
}
