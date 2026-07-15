import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { ApiDiagnosticsIndicator } from '@/components/ApiDiagnosticsIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2, ArrowLeft, CheckCircle, AlertCircle, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
    />
  </svg>
);

export default function Auth() {
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorTitle, setAuthErrorTitle] = useState('Sign-in Failed');
  const { signInWithMagicLink, signInWithGoogle, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authBusy = emailLoading || googleLoading;

  // Check for auth errors from URL
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      let friendlyMessage = 'Authentication failed. Please try again.';
      let friendlyTitle = 'Sign-in Failed';
      
      if (error === 'access_denied') {
        friendlyTitle = 'Google Sign-in Cancelled';
        friendlyMessage = 'Google sign-in was cancelled or denied. Please try again.';
      } else if (errorDescription?.includes('invalid') || errorDescription?.includes('expired')) {
        friendlyTitle = 'Link Expired';
        friendlyMessage = 'Magic link sudah expired atau dah guna. Cuba request yang baru.';
      } else if (errorDescription?.includes('signature')) {
        friendlyTitle = 'Invalid Link';
        friendlyMessage = 'Link tak sah. Cuba request magic link baru.';
      }
      
      setAuthErrorTitle(friendlyTitle);
      setAuthError(friendlyMessage);
      toast.error(friendlyMessage);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/chat');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setEmailLoading(true);
    
    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      let friendlyMessage = error.message || 'Failed to send magic link';
      
      if (error.message?.includes('rate limit')) {
        friendlyMessage = 'Terlalu banyak request. Cuba lagi dalam beberapa minit.';
      }
      
      toast.error(friendlyMessage);
      setEmailLoading(false);
      return;
    }

    setEmailSent(true);
    setEmailLoading(false);
    toast.success('Magic link sent! Check your email.');
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setGoogleLoading(true);

    const { error } = await signInWithGoogle();

    if (error) {
      const friendlyMessage = error.message || 'Unable to start Google sign-in. Please try again.';
      setAuthErrorTitle('Google Sign-in Failed');
      setAuthError(friendlyMessage);
      toast.error(friendlyMessage);
      setGoogleLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-background bg-nasi-pattern flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">👨🏻‍💻</span>
              <div>
                <h1 className="font-bold text-lg text-foreground">Kracked Food</h1>
                <p className="text-xs text-muted-foreground">Login to save your favorites</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ApiDiagnosticsIndicator />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-foreground hover:bg-muted"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Auth Error Banner */}
          {authError && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 animate-fade-up">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{authErrorTitle}</p>
                <p className="text-xs text-muted-foreground mt-1">{authError}</p>
              </div>
            </div>
          )}

          {emailSent ? (
            <div className="bg-card border border-border rounded-2xl p-6 text-center animate-fade-up">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Check your email!</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a magic link to <span className="font-medium text-foreground">{email}</span>
              </p>
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground">
                  <strong>Message:</strong>Click the link within 1 hour & Only click once
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setEmailSent(false);
                  setAuthError(null);
                }}
              >
                Use different email
              </Button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 animate-fade-up">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground mb-1">Selamat Makan</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in or create an account
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-3"
                onClick={handleGoogleSignIn}
                disabled={authBusy}
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon className="w-4 h-4" />
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground">
                    or continue with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={authBusy}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={authBusy || !email}
                >
                  {emailLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending magic link...
                    </>
                  ) : (
                    'Send Special Login Pass'
                  )}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-4">
                No password needed! We'll send you a secure login link.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
