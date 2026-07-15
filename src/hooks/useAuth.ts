import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-context';

// Keep this module hook-only so Vite preserves the component Fast Refresh boundary.
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
