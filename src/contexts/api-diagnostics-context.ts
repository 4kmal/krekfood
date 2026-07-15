import { createContext } from 'react';
import type { ApiDiagnostic, ApiDiagnosticInput } from '@/types/api-diagnostics';

export interface ApiDiagnosticsContextType {
  diagnostics: ApiDiagnostic[];
  reportDiagnostic: (diagnostic: ApiDiagnosticInput) => void;
  clearDiagnostics: () => void;
}

export const ApiDiagnosticsContext = createContext<ApiDiagnosticsContextType | undefined>(undefined);
