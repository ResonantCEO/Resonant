
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface ZipcodeResult {
  zipcode: string;
  city: string;
  state: string;
  formatted: string;
}

export function useZipcodeLookup(zipcode: string) {
  const [result, setResult] = useState<ZipcodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!zipcode || zipcode.length !== 5 || !/^\d{5}$/.test(zipcode)) {
      setResult(null);
      setError(null);
      return;
    }

    const lookupZipcode = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiRequest("GET", `/api/zipcode/${zipcode}`);
        setResult(response);
      } catch (err: any) {
        setError(err.message || "Failed to lookup zipcode");
        setResult(null);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(lookupZipcode, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [zipcode]);

  return { result, isLoading, error };
}
