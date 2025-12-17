import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  disabled?: boolean;
  showSuggestions?: boolean;
}

// Custom Kracked icon component
const KrackedIcon = ({ className }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 72 126" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M69.0696 15.85V12L62.3696 15.87V19.72C62.3696 20.42 62.3596 21.09 62.3296 21.71C62.2996 22.34 62.2597 22.99 62.1997 23.66L43.2297 34.61L41.8596 35.4L29.0195 42.82C28.9595 42.21 28.9196 41.61 28.8896 41.02C28.8596 40.42 28.8496 39.77 28.8496 39.07V35.22L22.1396 39.09V42.94C22.1396 44.81 22.2096 46.56 22.3596 48.2C22.4596 49.42 22.5996 50.58 22.7896 51.67C23.5396 56.11 24.9498 59.49 27.0098 61.82C27.9498 62.88 28.9896 63.88 30.1296 64.84C30.5896 65.22 31.0596 65.59 31.5596 65.96C32.4496 66.62 33.3896 67.25 34.3896 67.85C36.2096 68.96 38.2197 69.96 40.4097 70.86C40.0297 71.46 39.6496 72.06 39.2896 72.65C37.8896 74.87 36.5696 77.05 35.3396 79.17C33.0896 83.05 31.0896 86.76 29.3596 90.32C28.5096 92.05 27.7298 93.73 27.0098 95.38C23.7598 102.8 22.1396 110.96 22.1396 119.87V123.72L28.8496 119.85V116C28.8496 115.29 28.8596 114.63 28.8896 114C28.9196 113.38 28.9595 112.73 29.0195 112.06L55.2297 96.92L62.1997 92.9C62.2597 93.51 62.2996 94.11 62.3296 94.7C62.3596 95.29 62.3696 95.94 62.3696 96.65V100.49L69.0696 96.62V92.78C69.0696 83.86 67.4497 77.57 64.2097 73.9C60.9697 70.22 56.4996 67.21 50.8096 64.86C56.4996 55.93 60.9697 47.75 64.2097 40.34C67.4497 32.92 69.0696 24.76 69.0696 15.85Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M57.5098 80.22C58.2398 81.02 58.8597 81.89 59.3997 82.83C59.9297 83.78 60.4096 84.83 60.8596 85.98L48.0896 93.35L30.3596 103.59C30.7996 101.86 31.2896 100.23 31.8196 98.7C32.3496 97.18 32.9797 95.6 33.7097 93.96L42.3696 88.96L49.0696 85.09L53.7197 82.41L57.5098 80.22Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M51.8896 75.77L48.8496 77.53L46.5796 78.84L39.3196 83.03C40.2696 81.39 41.2796 79.72 42.3396 78.01C42.5396 77.68 42.7497 77.36 42.9597 77.03C43.8197 75.65 44.6996 74.26 45.6096 72.86C46.5696 73.24 47.5097 73.63 48.4197 74.04C48.5797 74.1 48.7296 74.17 48.8796 74.24C49.9396 74.72 50.9396 75.23 51.8896 75.77Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M48.8796 57.7C47.8196 59.4 46.7296 61.12 45.6096 62.86C44.4896 62.41 43.3996 61.95 42.3396 61.47C41.9096 61.28 41.4996 61.09 41.0896 60.89C40.4796 60.59 39.8896 60.27 39.3196 59.95L39.6597 59.75L51.8896 52.69C50.9396 54.33 49.9396 56 48.8796 57.7Z" stroke="#229EFF" strokeLinejoin="round"/>
    <path d="M59.3997 37.01C58.8597 38.54 58.2398 40.12 57.5098 41.75L33.7097 55.5C33.0297 54.75 32.4397 53.95 31.9297 53.07C31.8897 53.01 31.8596 52.94 31.8196 52.88C31.2896 51.94 30.7996 50.89 30.3596 49.74L35.8796 46.55L50.3796 38.18L60.8596 32.13C60.4096 33.86 59.9297 35.49 59.3997 37.01Z" stroke="#229EFF" strokeLinejoin="round"/>
  </svg>
);

const SUGGESTION_PAGES = [
  {
    title: 'Trending Now',
    icon: <KrackedIcon className="animate-pulse" />,
    suggestions: [
      { emoji: '🔥', text: 'Viral food spots in Bangi' },
      { emoji: '🍜', text: 'Hidden gem laksa around here' },
      { emoji: '🥩', text: 'Wagyu steak under RM100' },
      { emoji: '🧋', text: 'Best boba spot near me' },
      { emoji: '🍕', text: 'Late night pizza craving' },
      { emoji: '🌶️', text: 'Spiciest food challenge nearby' },
    ],
  },
  {
    title: 'Local Favorites',
    icon: <span className="text-xs">🇲🇾</span>,
    suggestions: [
      { emoji: '🍗', text: 'Ayam goreng paling crispy' },
      { emoji: '🍲', text: 'Sup tulang merah sedap' },
      { emoji: '🥘', text: 'Rendang tok yang legit' },
      { emoji: '🦀', text: 'Ketam butter somewhere good' },
      { emoji: '🍛', text: 'Nasi kandar power in PJ' },
      { emoji: '🥡', text: 'Char kuey teow wok hei' },
    ],
  },
  {
    title: 'Mood Based',
    icon: <span className="text-xs">💭</span>,
    suggestions: [
      { emoji: '🌧️', text: 'Comfort food for rainy day' },
      { emoji: '💼', text: 'Quick lunch under 30 mins' },
      { emoji: '🎉', text: 'Birthday dinner spot fancy' },
      { emoji: '🌙', text: 'Supper spot open till 3am' },
      { emoji: '👨‍👩‍👧', text: 'Family-friendly restaurant' },
      { emoji: '💑', text: 'Romantic date night place' },
    ],
  },
  {
    title: 'Budget Picks',
    icon: <span className="text-xs">💸</span>,
    suggestions: [
      { emoji: '🪙', text: 'Best eats under RM15' },
      { emoji: '🍱', text: 'Nasi campur paling berbaloi' },
      { emoji: '🥟', text: 'Cheap dim sum breakfast' },
      { emoji: '🌯', text: 'Student-friendly makan spot' },
      { emoji: '🍜', text: 'Ramen murah tapi sedap' },
      { emoji: '🥗', text: 'Healthy meal on budget' },
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
