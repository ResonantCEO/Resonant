import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export function ThemeSync() {
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isAuthenticated && user?.theme && user.theme !== theme) {
      setTheme(user.theme as 'dark' | 'light' | 'system');
    }
  }, [user?.theme, theme, setTheme, isAuthenticated]);

  return null;
}