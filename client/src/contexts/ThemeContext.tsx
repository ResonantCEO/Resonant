import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSystemPreference, setIsSystemPreference] = useState(true);
  const [mounted, setMounted] = useState(false);

  const { user } = useAuth();

  const shouldUseSystemPreference = !user?.theme || user.theme === 'system';

  // Update theme state when user or system preference changes
  useEffect(() => {
    const updateTheme = () => {
      if (shouldUseSystemPreference) {
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(systemPreference);
        setIsSystemPreference(true);
      } else {
        setTheme(user.theme as 'light' | 'dark');
        setIsSystemPreference(false);
      }
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (shouldUseSystemPreference) {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [user?.theme, shouldUseSystemPreference]);

  // Apply theme to document
  useEffect(() => {
    setMounted(true);

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1f2937' : '#f9fafb');
    }
  }, [theme]);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  const value = {
    theme,
    isSystemPreference,
    setTheme: (newTheme: 'light' | 'dark' | 'system') => {
      if (newTheme === 'system') {
        setIsSystemPreference(true);
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(systemPreference);
      } else {
        setIsSystemPreference(false);
        setTheme(newTheme);
      }
    },
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}