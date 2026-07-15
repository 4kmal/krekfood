import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { AuthContext } from '@/contexts/auth-context';
import { useApiDiagnostics } from '@/hooks/useApiDiagnostics';
import { supabase } from '@/integrations/supabase/client';
import type { ApiDiagnosticInput } from '@/types/api-diagnostics';

function getSupabaseAuthDiagnostic(error: Error | AuthError, service: string): ApiDiagnosticInput {
  const errorStatus = 'status' in error ? error.status : undefined;
  const status = typeof errorStatus === 'number' && errorStatus > 0 ? errorStatus : undefined;
  const normalized = error.message.toLowerCase();
  let category: ApiDiagnosticInput['category'] = 'unknown';
  let code = 'SUPABASE_AUTH_ERROR';
  let retryable = false;

  if (status === 429 || normalized.includes('rate limit') || normalized.includes('too many')) {
    category = 'quota';
    code = 'SUPABASE_AUTH_RATE_LIMIT';
    retryable = true;
  } else if (status === 401 || normalized.includes('invalid token') || normalized.includes('jwt')) {
    category = 'credentials';
    code = 'SUPABASE_AUTH_CREDENTIALS';
  } else if (status === 403 || normalized.includes('not allowed') || normalized.includes('permission')) {
    category = 'permission';
    code = 'SUPABASE_AUTH_PERMISSION';
  } else if (status && status >= 500) {
    category = 'upstream';
    code = 'SUPABASE_AUTH_UNAVAILABLE';
    retryable = true;
  } else if (normalized.includes('fetch') || normalized.includes('network')) {
    category = 'network';
    code = 'SUPABASE_AUTH_NETWORK';
    retryable = true;
  }

  return {
    provider: 'supabase',
    service,
    code,
    category,
    severity: 'error',
    message: category === 'quota'
      ? 'Supabase authentication rate limit was reached.'
      : 'Supabase authentication could not complete the request.',
    status,
    retryable,
    source: 'Authentication',
  };
}

function getMissingConfigurationDiagnostic(service: string): ApiDiagnosticInput {
  return {
    provider: 'supabase',
    service,
    code: 'SUPABASE_CONFIGURATION_MISSING',
    category: 'configuration',
    severity: 'error',
    message: 'The Supabase URL or publishable key is missing.',
    retryable: false,
    source: 'Authentication',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { reportDiagnostic } = useApiDiagnostics();

  useEffect(() => {
    let isProcessingHash = false;

    const handleHashAuth = async () => {
      const hash = window.location.hash;
      const hashParams = hash ? new URLSearchParams(hash.substring(1)) : null;
      const accessToken = hashParams?.get('access_token');
      const refreshToken = hashParams?.get('refresh_token');
      const errorParam = hashParams?.get('error');
      const errorDescription = hashParams?.get('error_description');

      if (accessToken || errorParam) {
        isProcessingHash = true;

        if (errorParam) {
          console.error('Auth error in callback:', errorParam, errorDescription);
          setLoading(false);

          if (errorParam !== 'access_denied') {
            reportDiagnostic(getSupabaseAuthDiagnostic(
              new Error(errorDescription || errorParam),
              'auth-callback',
            ));
          }

          const authErrorUrl = new URL('/auth', window.location.origin);
          authErrorUrl.searchParams.set('error', errorParam);
          if (errorDescription) {
            authErrorUrl.searchParams.set('error_description', errorDescription);
          }
          window.location.replace(authErrorUrl.toString());
          return;
        }

        if (accessToken) {
          try {
            const { data: { session: callbackSession }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) {
              console.error('Error setting session from callback:', error);
              reportDiagnostic(getSupabaseAuthDiagnostic(error, 'auth-session'));
              setLoading(false);
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }

            if (callbackSession) {
              setSession(callbackSession);
              setUser(callbackSession.user);
              setLoading(false);

              const currentPath = window.location.pathname;
              if (currentPath === '/' || currentPath === '') {
                setTimeout(() => {
                  window.location.href = '/chat';
                }, 100);
              } else {
                window.history.replaceState(null, '', currentPath + window.location.search);
              }
            } else {
              setLoading(false);
            }
          } catch (error) {
            console.error('Exception processing auth callback:', error);
            const authError = error instanceof Error ? error : new Error('Unknown authentication error');
            reportDiagnostic(getSupabaseAuthDiagnostic(authError, 'auth-callback'));
            setLoading(false);
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isProcessingHash || event !== 'SIGNED_IN') {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }

      if (event === 'SIGNED_IN' && window.location.hash) {
        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '') {
          setTimeout(() => {
            window.location.href = '/chat';
          }, 100);
        } else {
          window.history.replaceState(null, '', currentPath + window.location.search);
        }
      }
    });

    handleHashAuth().then(() => {
      if (!isProcessingHash) {
        supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
          if (error) {
            console.error('Unable to read Supabase session:', error);
            reportDiagnostic(getSupabaseAuthDiagnostic(error, 'auth-session'));
          }
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
          setLoading(false);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [reportDiagnostic]);

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = `${window.location.origin}/chat`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      const error = new Error('Supabase configuration missing. Please check your .env file.');
      reportDiagnostic(getMissingConfigurationDiagnostic('magic-link'));
      return { error };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });

    if (error) {
      console.error('Magic link error:', error);
      reportDiagnostic(getSupabaseAuthDiagnostic(error, 'magic-link'));
    }

    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/chat`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      const error = new Error('Supabase configuration missing. Please check your .env file.');
      reportDiagnostic(getMissingConfigurationDiagnostic('google-oauth'));
      return { error };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        reportDiagnostic(getSupabaseAuthDiagnostic(error, 'google-oauth'));
      }

      return { error: error as Error | null };
    } catch (error) {
      console.error('Google sign-in exception:', error);
      const authError = error instanceof Error ? error : new Error('Unable to start Google sign-in.');
      reportDiagnostic(getSupabaseAuthDiagnostic(authError, 'google-oauth'));
      return { error: authError };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out error:', error);
      reportDiagnostic(getSupabaseAuthDiagnostic(error, 'sign-out'));
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithMagicLink, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
