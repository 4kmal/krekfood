import { useMemo } from 'react';
import { Bot, RefreshCw, Router } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChatAiMode, ChatModelOption } from '@/types/chat-ai';

interface ChatAiModeBarProps {
  mode: ChatAiMode;
  models: ChatModelOption[];
  selectedModel: string;
  staleModel: string | null;
  loadingModels: boolean;
  modelsError: string | null;
  disabled: boolean;
  onModeChange: (mode: ChatAiMode) => void;
  onModelChange: (model: string) => void;
  onRefresh: () => void;
}

export function ChatAiModeBar({
  mode,
  models,
  selectedModel,
  staleModel,
  loadingModels,
  modelsError,
  disabled,
  onModeChange,
  onModelChange,
  onRefresh,
}: ChatAiModeBarProps) {
  const groupedModels = useMemo(() => {
    const groups = new Map<string, ChatModelOption[]>();
    models.forEach((model) => {
      const label = model.isCombo ? 'Combos' : model.ownedBy;
      const group = groups.get(label) ?? [];
      group.push(model);
      groups.set(label, group);
    });
    return Array.from(groups.entries());
  }, [models]);

  return (
    <section
      aria-label="AI model controls"
      className="sticky top-0 z-20 mb-4 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:w-auto">
          <Button
            type="button"
            size="sm"
            variant={mode === 'nine_router' ? 'default' : 'ghost'}
            className="gap-2"
            aria-pressed={mode === 'nine_router'}
            disabled={disabled}
            onClick={() => onModeChange('nine_router')}
          >
            <Router className="h-4 w-4" />
            9Router AI
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'gemini' ? 'default' : 'ghost'}
            className="gap-2"
            aria-pressed={mode === 'gemini'}
            disabled={disabled}
            onClick={() => onModeChange('gemini')}
          >
            <Bot className="h-4 w-4" />
            Gemini Legacy
          </Button>
        </div>

        {mode === 'nine_router' && (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Select
              value={selectedModel}
              onValueChange={onModelChange}
              disabled={disabled || loadingModels || models.length === 0}
            >
              <SelectTrigger className="min-w-0 flex-1 bg-background" aria-label="9Router model">
                <SelectValue placeholder={loadingModels ? 'Loading models...' : 'Select a model'} />
              </SelectTrigger>
              <SelectContent>
                {groupedModels.map(([owner, ownerModels]) => (
                  <SelectGroup key={owner}>
                    <SelectLabel className="capitalize">{owner}</SelectLabel>
                    {ownerModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Refresh 9Router models"
              disabled={disabled || loadingModels}
              onClick={onRefresh}
            >
              <RefreshCw className={`h-4 w-4 ${loadingModels ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>

      {mode === 'nine_router' && (
        <p className={`mt-2 text-xs ${modelsError ? 'text-destructive' : 'text-muted-foreground'}`}>
          {modelsError
            ? `${modelsError} Refresh the catalog before starting a 9Router chat.`
            : loadingModels
              ? 'Loading live models and fallback combos from 9Router...'
              : staleModel
                ? `${staleModel} is no longer available. ${selectedModel} is selected instead.`
              : `${models.length} live model${models.length === 1 ? '' : 's'} and combo${models.length === 1 ? '' : 's'} available.`}
        </p>
      )}
    </section>
  );
}
