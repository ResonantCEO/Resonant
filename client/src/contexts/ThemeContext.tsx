
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
  // Initialize theme state first (before any conditional logic)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    return saved as Theme || "light";
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Always call useAuth after state initialization
  const { user } = useAuth();

  // Handle user theme initialization only once
  useEffect(() => {
    if (!hasInitialized && user?.theme) {
      setTheme(user.theme as Theme);
      localStorage.setItem('app-theme', user.theme);
      setHasInitialized(true);
    }
  }, [user?.theme, hasInitialized]);

  // Handle theme changes and system theme detection
  useEffect(() => {
    const root = window.document.documentElement;
    
    const updateTheme = (newTheme: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
      setResolvedTheme(newTheme);
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
      updateTheme(theme);
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
