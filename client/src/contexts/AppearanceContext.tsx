import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface AppearanceContextType {
  compactMode: boolean;
  autoplayVideos: boolean;
  language: string;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [compactMode, setCompactMode] = useState(user?.compactMode ?? false);
  const [autoplayVideos, setAutoplayVideos] = useState(user?.autoplayVideos ?? true);
  const [language, setLanguage] = useState(user?.language || "en");

  useEffect(() => {
    if (user) {
      setCompactMode(user.compactMode ?? false);
      setAutoplayVideos(user.autoplayVideos ?? true);
      setLanguage(user.language || "en");
    }
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (compactMode) {
      root.classList.add("compact");
    } else {
      root.classList.remove("compact");
    }
  }, [compactMode]);

  const value = {
    compactMode,
    autoplayVideos,
    language,
  };

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}