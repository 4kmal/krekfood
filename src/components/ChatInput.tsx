import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Sparkles, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  disabled?: boolean;
  showSuggestions?: boolean;
}

const SUGGESTION_PAGES = [
  {
    title: 'Quick Prompts',
    icon: <Sparkles className="w-3 h-3 animate-pulse-glow" />,
    suggestions: [
      { emoji: '📍', text: 'Nasi lemak sedap near me' },
      { emoji: '🍜', text: 'Best mamak around KL' },
      { emoji: '🍣', text: 'Sushi murah kat Penang' },
      { emoji: '🍔', text: 'Burger best below RM20' },
      { emoji: '☕', text: 'Cafe vibes kat Bangsar' },
      { emoji: '🦐', text: 'Seafood fresh kat JB' },
    ],
  },
  {
    title: 'Budget Friendly',
    icon: <span className="text-xs">💰</span>,
    suggestions: [
      { emoji: '🍜', text: 'Makan sedap bawah RM10' },
      { emoji: '🍚', text: 'Nasi campur murah' },
      { emoji: '🥟', text: 'Dim sum budget friendly' },
      { emoji: '🌮', text: 'Street food terbaik' },
      { emoji: '🍛', text: 'Mamak 24 jam dekat sini' },
      { emoji: '🥤', text: 'Lunch set murah' },
    ],
  },
];

export function ChatInput({ onSend, loading, disabled, showSuggestions = true }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showChips, setShowChips] = useState(true);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim());
    setInput('');
    setShowChips(false);
  };

  const handleSuggestionClick = (text: string) => {
    onSend(text);
    setShowChips(false);
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % SUGGESTION_PAGES.length);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + SUGGESTION_PAGES.length) % SUGGESTION_PAGES.length);
  };

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const currentPageData = SUGGESTION_PAGES[currentPage];

  return (
    <div className="space-y-3">
      {/* AI Suggestions with Swipe Pages */}
      {showSuggestions && showChips && !loading && (
        <div className="space-y-2 animate-slide-down">
          {/* Header with navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {currentPageData.icon}
              <span>{currentPageData.title}:</span>
            </div>
            <div className="flex items-center gap-1">
              {suggestionsExpanded && (
                <>
                  <button
                    onClick={prevPage}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <div className="flex gap-1">
                    {SUGGESTION_PAGES.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx)}
                        className={`h-1 rounded-full transition-all ${
                          idx === currentPage
                            ? 'w-4 bg-primary'
                            : 'w-1 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                        aria-label={`Go to page ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextPage}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </>
              )}
              <button
                onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
                className="p-1 hover:bg-muted rounded transition-colors ml-1"
                aria-label={suggestionsExpanded ? "Minimize suggestions" : "Expand suggestions"}
              >
                {suggestionsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          {suggestionsExpanded && (
            <div className="flex flex-wrap gap-2 animate-slide-down">
              {currentPageData.suggestions.map((suggestion, idx) => (
                <button
                  key={`${currentPage}-${idx}`}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`mobbin-chip opacity-0 animate-stagger-fade stagger-${idx + 1}`}
                  style={{ animationFillMode: 'forwards' }}
                >
                  <span>{suggestion.emoji}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 animate-fade-up">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="nak makan apa?"
          className="flex-1 bg-card border-border mobbin-input"
          disabled={loading || disabled}
        />
        <Button 
          type="submit" 
          disabled={!input.trim() || loading || disabled}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 press-effect fab"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
