import { useContext } from 'react';
import { ApiDiagnosticsContext } from '@/contexts/api-diagnostics-context';

export function useApiDiagnostics() {
  const context = useContext(ApiDiagnosticsContext);

  if (context === undefined) {
    throw new Error('useApiDiagnostics must be used within an ApiDiagnosticsProvider');
  }

  return context;
}
