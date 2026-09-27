import { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DataDisclosure({ onContinue, onClose }: { onContinue: () => void; onClose: () => void }) {
  const continueButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { continueButton.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wrapped-data-title"
        aria-describedby="wrapped-data-description"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-6 text-foreground shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          } else if (event.key === 'Tab') {
            // The notice has two controls; keep keyboard focus inside it.
            event.preventDefault();
            if (event.target === continueButton.current) closeButton.current?.focus();
            else continueButton.current?.focus();
          }
        }}
      >
        <ShieldCheck className="mb-3 size-8 text-primary" aria-hidden />
        <h2 id="wrapped-data-title" className="text-xl font-semibold">Your data stays on your device</h2>
        <div id="wrapped-data-description" className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>Canvas Wrapped reads your Canvas information using your existing login to create your recap. It does not change your courses, grades, or submissions.</p>
          <p>Your recap is calculated on your device. A copy of the data is cached in this browser so Wrapped can open faster. The extension does not upload or save your Canvas data to its own servers or send it to an AI service.</p>
          <p>If you choose to copy the What's Next prompt and send it to an external AI, you are sharing that information with that provider under its policies.</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button ref={closeButton} type="button" variant="outline" onClick={onClose}>Not now</Button>
          <Button ref={continueButton} type="button" onClick={onContinue}>Got it — open Wrapped</Button>
        </div>
      </section>
    </div>
  );
}
