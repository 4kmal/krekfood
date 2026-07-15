import { AlertTriangle } from 'lucide-react';
import { useApiDiagnostics } from '@/hooks/useApiDiagnostics';
import { Button } from '@/components/ui/button';
import { ApiDiagnosticsPanel } from '@/components/ApiDiagnosticsPanel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function ApiDiagnosticsIndicator() {
  const { diagnostics } = useApiDiagnostics();

  if (diagnostics.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Open API diagnostics with ${diagnostics.length} issue${diagnostics.length === 1 ? '' : 's'}`}
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {diagnostics.length > 99 ? '99+' : diagnostics.length}
          </span>
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="pr-8">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            API diagnostics
          </SheetTitle>
          <SheetDescription>
            Sanitized provider errors from this browser tab. API keys and raw provider responses are never stored here.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <ApiDiagnosticsPanel showHeading={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
