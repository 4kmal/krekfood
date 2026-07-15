import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApiDiagnostics } from '@/hooks/useApiDiagnostics';
import { PROVIDER_METADATA } from '@/types/api-diagnostics';
import { Button } from '@/components/ui/button';

interface ApiDiagnosticsPanelProps {
  showHeading?: boolean;
}

export function ApiDiagnosticsPanel({ showHeading = true }: ApiDiagnosticsPanelProps) {
  const { diagnostics, clearDiagnostics } = useApiDiagnostics();

  const copyDiagnostics = async () => {
    const sanitizedLog = diagnostics.map((diagnostic) => ({
      provider: diagnostic.provider,
      service: diagnostic.service,
      code: diagnostic.code,
      category: diagnostic.category,
      severity: diagnostic.severity,
      status: diagnostic.status,
      retryable: diagnostic.retryable,
      source: diagnostic.source,
      message: diagnostic.message,
      timestamp: diagnostic.timestamp,
      occurrences: diagnostic.occurrences,
    }));

    try {
      await navigator.clipboard.writeText(JSON.stringify(sanitizedLog, null, 2));
      toast.success('Sanitized API diagnostics copied');
    } catch {
      toast.error('Unable to copy API diagnostics');
    }
  };

  if (diagnostics.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          No API issues in this tab
        </div>
      </div>
    );
  }

  return (
    <div>
      {showHeading && (
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            API diagnostics
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sanitized errors only; keys and raw provider responses are never stored.
          </p>
        </div>
      )}

      <div className="mb-3 flex gap-2">
        <Button variant="outline" size="sm" className="min-h-11 gap-2" onClick={copyDiagnostics}>
          <Copy className="h-4 w-4" />
          Copy log
        </Button>
        <Button variant="ghost" size="sm" className="min-h-11 gap-2 text-destructive" onClick={clearDiagnostics}>
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="space-y-3">
        {diagnostics.map((diagnostic) => {
          const provider = PROVIDER_METADATA[diagnostic.provider];
          return (
            <article key={diagnostic.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{provider.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      diagnostic.severity === 'error'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {diagnostic.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{diagnostic.source} · {diagnostic.service}</p>
                </div>
                <time className="whitespace-nowrap text-[11px] text-muted-foreground" dateTime={diagnostic.timestamp}>
                  {new Date(diagnostic.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>

              <p className="mt-3 text-sm text-foreground">{diagnostic.message}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                  <dt className="text-muted-foreground">Code</dt>
                  <dd className="break-all font-mono text-foreground">{diagnostic.code}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">HTTP status</dt>
                  <dd className="text-foreground">{diagnostic.status ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Retryable</dt>
                  <dd className="text-foreground">{diagnostic.retryable ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Occurrences</dt>
                  <dd className="text-foreground">{diagnostic.occurrences}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">{provider.action}</p>
              <a
                href={provider.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open {provider.label} dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
