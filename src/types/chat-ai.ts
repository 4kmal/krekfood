import type { ApiDiagnosticPayload } from '@/types/api-diagnostics';

export type ChatAiMode = 'nine_router' | 'gemini';

export interface ChatModelOption {
  id: string;
  ownedBy: string;
  isCombo: boolean;
}

export interface ModelsResponse {
  models: ChatModelOption[];
  defaultModel: string;
  diagnostics?: ApiDiagnosticPayload[];
}

export const DEFAULT_CHAT_AI_MODE: ChatAiMode = 'nine_router';
export const DEFAULT_NINE_ROUTER_MODEL = 'krekfood-chat';
