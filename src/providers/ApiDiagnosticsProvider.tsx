import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiDiagnosticsContext } from '@/contexts/api-diagnostics-context';
import { isApiDiagnosticPayload, type ApiDiagnostic, type ApiDiagnosticInput } from '@/types/api-diagnostics';

const STORAGE_KEY = 'krekfood-api-diagnostics';
const MAX_DIAGNOSTICS = 20;
const DEDUPE_WINDOW_MS = 60_000;

function readStoredDiagnostics(): ApiDiagnostic[] {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is ApiDiagnostic => (
        entry &&
        isApiDiagnosticPayload(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.source === 'string' &&
        typeof entry.timestamp === 'string' &&
        typeof entry.occurrences === 'number'
      ))
      .slice(0, MAX_DIAGNOSTICS);
  } catch {
    return [];
  }
}

function storeDiagnostics(diagnostics: ApiDiagnostic[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(diagnostics));
  } catch {
    // Diagnostics must never interrupt the application if storage is unavailable.
  }
}

export function ApiDiagnosticsProvider({ children }: { children: ReactNode }) {
  const [diagnostics, setDiagnostics] = useState<ApiDiagnostic[]>(readStoredDiagnostics);

  const reportDiagnostic = useCallback((input: ApiDiagnosticInput) => {
    setDiagnostics((current) => {
      const now = new Date();
      const duplicateIndex = current.findIndex((entry) => (
        entry.provider === input.provider &&
        entry.service === input.service &&
        entry.code === input.code &&
        entry.source === input.source &&
        now.getTime() - new Date(entry.timestamp).getTime() <= DEDUPE_WINDOW_MS
      ));

      let next: ApiDiagnostic[];

      if (duplicateIndex >= 0) {
        const duplicate = current[duplicateIndex];
        const updated: ApiDiagnostic = {
          ...duplicate,
          ...input,
          timestamp: now.toISOString(),
          occurrences: duplicate.occurrences + 1,
        };
        next = [updated, ...current.filter((_, index) => index !== duplicateIndex)];
      } else {
        const entry: ApiDiagnostic = {
          ...input,
          id: globalThis.crypto?.randomUUID?.() ?? `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
          timestamp: now.toISOString(),
          occurrences: 1,
        };
        next = [entry, ...current].slice(0, MAX_DIAGNOSTICS);
      }

      storeDiagnostics(next);
      return next;
    });
  }, []);

  const clearDiagnostics = useCallback(() => {
    setDiagnostics([]);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const value = useMemo(() => ({ diagnostics, reportDiagnostic, clearDiagnostics }), [
    diagnostics,
    reportDiagnostic,
    clearDiagnostics,
  ]);

  return (
    <ApiDiagnosticsContext.Provider value={value}>
      {children}
    </ApiDiagnosticsContext.Provider>
  );
}
