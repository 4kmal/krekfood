import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { SavedPlacesList } from '@/components/SavedPlacesList';

export default function Bookmarks() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { bookmarks, loading, removeBookmark } = useBookmarks();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-nasi-pattern">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} aria-label="Back to chat">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Saved Places</h1>
              <p className="text-xs text-muted-foreground">{bookmarks.length} kedai saved</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="text-foreground hover:bg-muted"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4">
        <SavedPlacesList
          bookmarks={bookmarks}
          loading={loading}
          onRemove={removeBookmark}
          onExplore={() => navigate('/chat')}
        />
      </main>
    </div>
  );
}
