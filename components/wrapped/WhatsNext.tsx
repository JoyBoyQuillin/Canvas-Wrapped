import { useId, useRef, useState } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { learningPlanPrompt } from '@/lib/learning-plan-prompt';
import type { WrappedStats } from '@/lib/wrapped';

export default function WhatsNext({ stats }: { stats: WrappedStats }) {
  const initialPrompt = learningPlanPrompt(stats);
  return <PromptPreview key={initialPrompt} prompt={initialPrompt} rangeLabel={stats.rangeLabel} />;
}

function PromptPreview({ prompt, rangeLabel }: { prompt: string; rangeLabel: string }) {
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
      textarea.current?.focus();
      textarea.current?.select();
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-end gap-4">
      <Button
        type="button"
        variant="secondary"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide prompt' : "What's Next"} <ArrowRight aria-hidden />
      </Button>
      {open && (
        <section id={id} aria-labelledby={`${id}-title`} className="w-full min-w-0 rounded-xl border border-white/20 bg-black/25 p-4 text-white">
          <h3 id={`${id}-title`} className="text-xl font-semibold">Find your next steps and study resources</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            This prompt uses your Wrapped stats ({rangeLabel}) to ask an AI for a personalized learning
            plan and course-specific videos, practice problems, textbooks, and support resources—with
            suggestions for how to use them. Click Copy prompt, paste it into the
            AI chat of your choice, and send it. You can edit it in that chat before sending.
          </p>
          <p id={`${id}-privacy`} className="mt-3 rounded-md border border-amber-200/30 bg-amber-200/10 p-3 text-sm leading-relaxed text-white/90">
            <strong>Before you share:</strong> Canvas Wrapped processes your data and caches it locally
            in your browser. It does not send this prompt to an AI automatically. The prompt includes
            grades, course names, and study habits. Sending it to an external AI shares that information
            with its provider, which may store or use it under its own policies and settings. Review
            those policies and remove anything you do not want to share in the AI chat before sending.
          </p>
          <label htmlFor={`${id}-prompt`} className="mt-4 block text-sm font-medium">Your ready-to-copy prompt</label>
          <textarea
            ref={textarea}
            id={`${id}-prompt`}
            value={prompt}
            readOnly
            aria-describedby={`${id}-privacy`}
            onKeyDown={(event) => event.stopPropagation()}
            rows={10}
            spellCheck={false}
            className="wrapped-scrollbar wrapped-prompt-preview mt-2 block max-h-80 min-h-40 w-full resize-none overflow-y-auto rounded-md border border-white/30 bg-white p-3 font-mono text-sm leading-relaxed text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-white/80">
              {copyStatus === 'copied' ? 'Copied! Paste it into your preferred AI.'
                : copyStatus === 'failed' ? 'Copy was blocked. The prompt is selected; press Ctrl+C or Command+C.'
                : 'You choose which AI receives this information.'}
            </p>
            <Button type="button" variant="secondary" onClick={copyPrompt}>
              {copyStatus === 'copied' ? <Check aria-hidden /> : <Copy aria-hidden />} Copy prompt
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
