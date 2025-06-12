
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeSync() {
  const [hasInitialized, setHasInitialized] = useState(false);
  const { user } = useAuth();
  const { setTheme } = useTheme();

  // Handle user theme initialization only once
  useEffect(() => {
    if (!hasInitialized && user?.theme) {
      setTheme(user.theme as "light" | "dark" | "system");
      setHasInitialized(true);
    }
  }, [user?.theme, hasInitialized, setTheme]);

  return null; // This component doesn't render anything
}
