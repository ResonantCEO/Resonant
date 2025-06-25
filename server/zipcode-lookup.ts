import fetch from 'node-fetch';

interface ZipcodeApiResponse {
  'post code': string;
  country: string;
  'country abbreviation': string;
  places: Array<{
    'place name': string;
    longitude: string;
    state: string;
    'state abbreviation': string;
    latitude: string;
  }>;
}

export async function lookupZipcode(zipcode: string): Promise<{ city: string; state: string } | null> {
  try {
    const normalizedZip = zipcode.trim().padStart(5, '0');

    // Validate US zipcode format
    if (!/^\d{5}$/.test(normalizedZip)) {
      return null;
    }

    // Use Zippopotam.us API (free, no API key required)
    const response = await fetch(`http://api.zippopotam.us/us/${normalizedZip}`);

    if (!response.ok) {
      return null;
    }

    const data: ZipcodeApiResponse = await response.json();

    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        city: place['place name'],
        state: place['state abbreviation']
      };
    }

    return null;
  } catch (error) {
    console.error('Error looking up zipcode:', error);
    // Fallback to hardcoded data for development
    return lookupZipcodeLocal(zipcode);
  }
}

// Keep a small fallback dataset for development/testing
const fallbackData: Record<string, { city: string; state: string }> = {
  '10001': { city: 'New York', state: 'NY' },
  '90210': { city: 'Beverly Hills', state: 'CA' },
  '02101': { city: 'Boston', state: 'MA' },
  '60601': { city: 'Chicago', state: 'IL' },
  '33101': { city: 'Miami', state: 'FL' },
  '23188': { city: 'West Point', state: 'VA' },
  '80525': { city: 'Fort Collins', state: 'CO' },
};

function lookupZipcodeLocal(zipcode: string): { city: string; state: string } | null {
  const normalizedZip = zipcode.trim().padStart(5, '0');
  return fallbackData[normalizedZip] || null;
}

export function formatCityState(city: string, state: string): string {
  return `${city}, ${state}`;
}

// Add caching for frequently looked up zipcodes
const zipcodeCache = new Map<string, { city: string; state: string } | null>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

export async function lookupZipcodeWithCache(zipcode: string): Promise<{ city: string; state: string } | null> {
  const normalizedZip = zipcode.trim().padStart(5, '0');
  const now = Date.now();

  // Check if we have a cached result that's still valid
  if (zipcodeCache.has(normalizedZip)) {
    const timestamp = cacheTimestamps.get(normalizedZip);
    if (timestamp && now - timestamp < CACHE_TTL) {
      return zipcodeCache.get(normalizedZip) || null;
    }
  }

  // Fetch fresh data
  const result = await lookupZipcode(normalizedZip);

  // Cache the result
  zipcodeCache.set(normalizedZip, result);
  cacheTimestamps.set(normalizedZip, now);

  return result;
}