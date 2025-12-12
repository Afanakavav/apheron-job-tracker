/**
 * Cache Service - Intelligent caching for frequently used data
 * Uses localStorage with expiration and automatic cleanup
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const CACHE_PREFIX = 'apheron_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if expired
    if (now > entry.expiresAt) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Set cached data
 */
export function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing cache:', error);
    // If quota exceeded, clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearExpiredCache();
    }
  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const keys = Object.keys(localStorage);
  const now = Date.now();

  keys.forEach((key) => {
    if (key.startsWith(CACHE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry<any> = JSON.parse(cached);
          if (now > entry.expiresAt) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // Invalid entry, remove it
        localStorage.removeItem(key);
      }
    }
  });
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { total: number; expired: number; size: number } {
  const keys = Object.keys(localStorage);
  const now = Date.now();
  let total = 0;
  let expired = 0;
  let size = 0;

  keys.forEach((key) => {
    if (key.startsWith(CACHE_PREFIX)) {
      total++;
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          size += cached.length;
          const entry: CacheEntry<any> = JSON.parse(cached);
          if (now > entry.expiresAt) {
            expired++;
          }
        }
      } catch (error) {
        // Invalid entry
      }
    }
  });

  return { total, expired, size };
}

// Cache keys
export const CACHE_KEYS = {
  APPLICATIONS: (userId: string) => `applications_${userId}`,
  CONTACTS: (userId: string) => `contacts_${userId}`,
  CVS: (userId: string) => `cvs_${userId}`,
  ANALYTICS: (userId: string) => `analytics_${userId}`,
  USER_PROFILE: (userId: string) => `user_profile_${userId}`,
} as const;

// TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

// Clean expired cache on load
if (typeof window !== 'undefined') {
  clearExpiredCache();
  // Clean expired cache every 10 minutes
  setInterval(clearExpiredCache, 10 * 60 * 1000);
}

