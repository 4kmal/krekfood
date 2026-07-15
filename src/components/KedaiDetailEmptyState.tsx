import { MapPin, MousePointerClick } from 'lucide-react';

export function KedaiDetailEmptyState() {
  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-background">
      <div className="flex-shrink-0 border-b border-border p-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Restaurant Details</h2>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-xs text-center">
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <MapPin className="h-8 w-8" aria-hidden="true" />
            <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background bg-card text-foreground shadow-sm">
              <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground">Select a restaurant</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose a recommendation in the chat or a marker on the map to see its menu,
            reviews, directions, and more.
          </p>
        </div>
      </div>
    </aside>
  );
}
