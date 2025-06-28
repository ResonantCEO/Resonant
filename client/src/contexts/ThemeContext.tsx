
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
  // Always call useAuth first
  const { user } = useAuth();
  
  // Initialize theme state with proper fallback logic
  const [theme, setTheme] = useState<Theme>(() => {
    // First check if user has a theme preference
    if (user?.theme) {
      return user.theme as Theme;
    }
    // Then check localStorage
    const saved = localStorage.getItem('app-theme');
    return (saved as Theme) || "light";
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Handle user theme initialization
  useEffect(() => {
    if (user?.theme && !hasInitialized) {
      const userTheme = user.theme as Theme;
      setTheme(userTheme);
      localStorage.setItem('app-theme', userTheme);
      setHasInitialized(true);
    } else if (!user && !hasInitialized) {
      // If no user, check localStorage
      const saved = localStorage.getItem('app-theme');
      if (saved) {
        setTheme(saved as Theme);
      }
      setHasInitialized(true);
    }
  }, [user, hasInitialized]);

  // Handle theme changes and system theme detection
  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = (newTheme: "light" | "dark") => {
      // Remove both classes first
      root.classList.remove("light", "dark");
      // Add the new theme class
      root.classList.add(newTheme);
      setResolvedTheme(newTheme);
      
      // Debug logging
      console.log(`Theme updated to: ${newTheme}`, {
        themeState: theme,
        rootClasses: root.className,
        resolvedTheme: newTheme
      });
    };

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      updateTheme(systemTheme);
      
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        updateTheme(e.matches ? "dark" : "light");
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      updateTheme(theme as "light" | "dark");
    }
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  const value = {
    theme,
    setTheme: handleSetTheme,
    resolvedTheme,
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
