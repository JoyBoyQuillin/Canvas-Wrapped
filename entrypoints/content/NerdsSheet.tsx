import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { SlideDef } from '@/components/wrapped/slides';
import type { WrappedStats } from '@/lib/wrapped';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiTest from './ApiTest';

function JsonBlock({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Button variant="outline" size="sm" onClick={copy} className="self-end">
        {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy JSON'}
      </Button>
      <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>
    </div>
  );
}

/** Side sheet behind a right-click: the numbers behind a slide, everything, and the API test. */
export default function NerdsSheet({
  slide, stats, savedAt, onClose,
}: { slide: SlideDef | null; stats: WrappedStats | null; savedAt: number | null; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex justify-end bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l bg-background text-foreground shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300"
        aria-label="Stats for nerds"
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold">Stats for nerds</p>
            {savedAt && <p className="text-xs text-muted-foreground">Data fetched {new Date(savedAt).toLocaleString()}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close stats for nerds">
            <X />
          </Button>
        </header>
        <Tabs defaultValue={slide ? 'slide' : 'all'} className="min-h-0 flex-1 gap-3 p-4">
          <TabsList>
            {slide && <TabsTrigger value="slide">This slide</TabsTrigger>}
            <TabsTrigger value="all">All stats</TabsTrigger>
            <TabsTrigger value="api">API test</TabsTrigger>
          </TabsList>
          {slide && (
            <TabsContent value="slide" className="flex min-h-0 flex-col gap-2">
              <p className="text-sm text-muted-foreground">Numbers behind “{slide.title}”.</p>
              <JsonBlock value={slide.data} />
            </TabsContent>
          )}
          <TabsContent value="all" className="flex min-h-0 flex-col">
            <JsonBlock value={stats} />
          </TabsContent>
          <TabsContent value="api" className="min-h-0 overflow-y-auto">
            <ApiTest />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
