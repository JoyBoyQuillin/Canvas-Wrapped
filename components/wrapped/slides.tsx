import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DAYS, type WrappedStats } from '@/lib/wrapped';
import { fmtDate, fmtDuration, fmtHour, pct } from '@/lib/wrapped-slides';
import { BarList, BigStat, Headline, MiniStat, Slide, Sub } from './primitives';

export interface SlideDef {
  id: string;
  title: string; // for screen readers and the slide counter
  content: ReactNode;
}

function StudyClock({ byHour, peakHour }: { byHour: number[]; peakHour: number | null }) {
  const max = Math.max(...byHour, 1);
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-28 items-end gap-[3px]" aria-hidden>
        {byHour.map((views, hour) => (
          <div
            key={hour}
            className={cn('flex-1 rounded-t-sm', hour === peakHour ? 'bg-white' : 'bg-white/35')}
            style={{ height: `${Math.max((views / max) * 100, 2)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-white/60" aria-hidden>
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
      </div>
      <figcaption className="sr-only">Canvas page views by hour of day, peaking at {peakHour === null ? 'no hour' : fmtHour(peakHour)}.</figcaption>
    </figure>
  );
}

function DayStrip({ byDay }: { byDay: number[] }) {
  const max = Math.max(...byDay, 1);
  return (
    <div className="grid grid-cols-7 gap-2" aria-hidden>
      {byDay.map((views, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="size-8 rounded-md bg-white" style={{ opacity: 0.15 + (views / max) * 0.85 }} />
          <span className="text-xs text-white/60">{DAYS[i]!.slice(0, 3)}</span>
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
  const slides: SlideDef[] = [];

  slides.push({
    id: 'intro',
    title: 'Welcome',
    content: (
      <Slide theme="violet" eyebrow="Canvas Wrapped">
        <p className="text-lg font-medium text-white/80">Hey {w.studentName.split(' ')[0]},</p>
        <h2 className="text-5xl leading-[1.05] font-black tracking-tight">Your semester,<br />wrapped.</h2>
        <Sub>
          {w.terms.join(' + ')}
          {w.dateRange && <> · {fmtDate(w.dateRange.from)} – {fmtDate(w.dateRange.to)}</>}
        </Sub>
      </Slide>
    ),
  });

  slides.push({
    id: 'hours',
    title: 'Time in Canvas',
    content: (
      <Slide theme="emerald" eyebrow="Time in Canvas">
        <Headline>You spent</Headline>
        <BigStat value={w.totalHours} unit="hours" />
        <Sub>in Canvas. That's about {Math.round((w.totalHours / 24) * 10) / 10} full days of your life.</Sub>
      </Slide>
    ),
  });

  if (top) {
    slides.push({
      id: 'courses',
      title: 'Top courses',
      content: (
        <Slide theme="fuchsia" eyebrow="Top courses">
          <Headline>{top.label} had your heart.</Headline>
          <BarList
            ranked
            items={w.courses.slice(0, 5).map((c) => ({ label: c.label, value: c.hours, display: `${c.hours}h` }))}
          />
        </Slide>
      ),
    });
  }

  slides.push({
    id: 'submissions',
    title: 'Submissions',
    content: (
      <Slide theme="orange" eyebrow="Submissions">
        <Headline>You turned in</Headline>
        <BigStat value={s.total} unit="assignments" />
        <BarList items={s.byType.slice(0, 4).map((t) => ({ label: t.label, value: t.count, display: String(t.count) }))} />
      </Slide>
    ),
  });

  slides.push({
    id: 'on-time',
    title: 'On time',
    content: (
      <Slide theme="sky" eyebrow="Reliability">
        <BigStat value={pct(s.onTimeRate)} unit="on time" />
        <Sub>Only {s.late} late {s.late === 1 ? 'submission' : 'submissions'} all semester.</Sub>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Perfect scores" value={s.perfectScores} />
          <MiniStat label="Average score" value={s.avgPercent === null ? '—' : `${s.avgPercent}%`} />
        </div>
      </Slide>
    ),
  });

  slides.push({
    id: 'deadlines',
    title: 'Deadline personality',
    content: (
      <Slide theme="rose" eyebrow="Deadline personality">
        <p className="text-5xl leading-[1.05] font-black tracking-tight">{d.persona}</p>
        {d.medianHoursEarly !== null && <Sub>You usually submit {d.medianHoursEarly}h before the deadline.</Sub>}
        <div className="flex flex-col gap-3">
          {d.closestCall && (
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-xs font-medium tracking-wide text-white/60 uppercase">Closest call</p>
              <p className="mt-1 font-semibold">{d.closestCall.assignment}</p>
              <p className="text-sm text-white/70">{d.closestCall.course} · {fmtDuration(d.closestCall.minutesBefore)} to spare</p>
            </div>
          )}
          {d.earliest && (
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-xs font-medium tracking-wide text-white/60 uppercase">Most prepared</p>
              <p className="mt-1 font-semibold">{d.earliest.assignment}</p>
              <p className="text-sm text-white/70">{d.earliest.course} · {d.earliest.daysBefore} days early</p>
            </div>
          )}
        </div>
      </Slide>
    ),
  });

  if (w.clock.totalPageViews > 0) {
    slides.push({
      id: 'clock',
      title: 'Study clock',
      content: (
        <Slide theme="night" eyebrow="Study clock">
          <p className="text-5xl leading-[1.05] font-black tracking-tight">{w.clock.persona}</p>
          <Sub>
            Peak Canvas hour: <strong className="text-white">{w.clock.peakHour !== null && fmtHour(w.clock.peakHour)}</strong>.
            Busiest day: <strong className="text-white">{w.clock.peakDay}</strong>.
          </Sub>
          <StudyClock byHour={w.clock.byHour} peakHour={w.clock.peakHour} />
          <DayStrip byDay={w.clock.byDay} />
        </Slide>
      ),
    });
  }

  if (w.redo) {
    slides.push({
      id: 'redo',
      title: 'Never give up',
      content: (
        <Slide theme="amber" eyebrow="Never give up award">
          <BigStat value={w.redo.attempts} unit="attempts" />
          <Headline>{w.redo.assignment}</Headline>
          <Sub>{w.redo.course}. You kept going until you got it.</Sub>
        </Slide>
      ),
    });
  }

  if (graded.length) {
    slides.push({
      id: 'grades',
      title: 'Grades',
      content: (
        <Slide theme="green" eyebrow="Report card">
          <Headline>Top of the class (yours, anyway): {graded[0]!.label}.</Headline>
          <ul className="flex flex-col divide-y divide-white/15">
            {graded.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0 truncate font-medium">{c.label}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-white/80 tabular-nums">{c.score}%</span>
                  {c.grade && <Badge className="min-w-9 bg-white font-bold text-green-800">{c.grade}</Badge>}
                </span>
              </li>
            ))}
          </ul>
        </Slide>
      ),
    });
  }

  slides.push({
    id: 'messages',
    title: 'Inbox',
    content: (
      <Slide theme="cyan" eyebrow="Inbox">
        <BigStat value={w.messages.received} unit="messages" />
        <Sub>across {w.messages.threads} conversations. You started {w.messages.sent} of them yourself.</Sub>
      </Slide>
    ),
  });

  slides.push({
    id: 'recap',
    title: 'Recap',
    content: (
      <Slide theme="finale" eyebrow="Your Wrapped">
        <Headline>That's a wrap, {w.studentName.split(' ')[0]}.</Headline>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStat label="Hours" value={w.totalHours} />
          <MiniStat label="Submitted" value={s.total} />
          <MiniStat label="On time" value={pct(s.onTimeRate)} />
          <MiniStat label="Top course" value={top?.label ?? '—'} />
          <MiniStat label="Deadlines" value={d.persona} />
          <MiniStat label="Clock" value={w.clock.persona} />
        </div>
      </Slide>
    ),
  });

  return slides;
}
