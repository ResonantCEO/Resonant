
import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeSync() {
  const { theme } = useTheme();

  useEffect(() => {
    try {
      const root = window.document.documentElement;
      
      // Remove all theme classes first
      root.classList.remove('light', 'dark');
      
      // Apply the current theme
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }, [theme]);

  return null;
}
