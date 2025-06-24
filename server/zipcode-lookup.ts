
// Simple zipcode to city/state lookup
// In a real application, you'd use a proper zipcode API or database
const zipcodeData: Record<string, { city: string; state: string }> = {
  "10001": { city: "New York", state: "NY" },
  "90210": { city: "Beverly Hills", state: "CA" },
  "60601": { city: "Chicago", state: "IL" },
  "02101": { city: "Boston", state: "MA" },
  "75201": { city: "Dallas", state: "TX" },
  "30301": { city: "Atlanta", state: "GA" },
  "98101": { city: "Seattle", state: "WA" },
  "33101": { city: "Miami", state: "FL" },
  "80201": { city: "Denver", state: "CO" },
  "85001": { city: "Phoenix", state: "AZ" },
  // Add more as needed
};

export function lookupZipcode(zipcode: string): { city: string; state: string } | null {
  const normalizedZip = zipcode.trim().padStart(5, '0');
  return zipcodeData[normalizedZip] || null;
}

export function formatCityState(city: string, state: string): string {
  return `${city}, ${state}`;
}
