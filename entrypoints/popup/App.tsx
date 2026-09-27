import { Sparkles } from 'lucide-react';

/** Toolbar popup: Wrapped itself lives on Canvas pages, so this just points the way there. */
export default function App() {
  return (
    <main className="w-80 space-y-3 p-4 font-sans text-sm text-foreground">
      <h1 className="flex items-center gap-2 text-base font-semibold">
        <Sparkles className="size-4 text-primary" /> Canvas Wrapped
      </h1>
      <p>
        Open your school's Canvas site and click the <strong>Canvas Wrapped</strong> button in the
        bottom-right corner to see your recap.
      </p>
      <p className="text-muted-foreground">
        Your Canvas data is read with your existing login and stays on this device. Nothing is sent
        anywhere else.
      </p>
    </main>
  );
}
