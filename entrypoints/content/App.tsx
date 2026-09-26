import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiTest from './ApiTest';
import WrappedDemo from './WrappedDemo';

/**
 * Launcher button plus a full-viewport overlay, so Canvas's fixed nav and sidebars
 * can't cover it. The overlay stays mounted while closed so results survive reopening.
 */
export default function App() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  function show() {
    setEverOpened(true);
    setOpen(true);
  }

  return (
    <div className="font-sans text-foreground">
      {!open && (
        <Button className="fixed right-4 bottom-4 z-[2147483647] rounded-full shadow-lg" size="lg" onClick={show}>
          <Sparkles /> Canvas Wrapped
        </Button>
      )}

      {everOpened && (
        <div
          className={cn('fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/60 p-4', !open && 'hidden')}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Canvas Wrapped"
            tabIndex={-1}
            className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl outline-none"
          >
            <Tabs defaultValue="wrapped" className="min-h-0 flex-1 gap-0">
              <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 font-semibold">
                    <Sparkles className="size-4 text-primary" aria-hidden /> Canvas Wrapped
                  </span>
                  <TabsList>
                    <TabsTrigger value="wrapped">Wrapped</TabsTrigger>
                    <TabsTrigger value="api">API test</TabsTrigger>
                  </TabsList>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                  <X />
                </Button>
              </header>

              {/* forceMount keeps each tab's results when switching; inactive tab is just hidden. */}
              <TabsContent value="wrapped" forceMount className="min-h-0 overflow-y-auto p-4 data-[state=inactive]:hidden">
                <WrappedDemo />
              </TabsContent>
              <TabsContent value="api" forceMount className="min-h-0 overflow-y-auto p-4 data-[state=inactive]:hidden">
                <ApiTest />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
