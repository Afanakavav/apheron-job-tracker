/**
 * Prefetch Service - Preload data in background for better UX
 */

import { getCachedData, setCachedData, CACHE_KEYS, CACHE_TTL } from './cacheService';
import { getUserApplications } from './applicationService';
import { getContacts } from './networkingService';
import { getUserCVs } from './cvService';
import { getAuth } from 'firebase/auth';

/**
 * Check if user is authenticated
 */
function isAuthenticated(): boolean {
  try {
    const auth = getAuth();
    return !!auth.currentUser;
  } catch {
    return false;
  }
}

/**
 * Prefetch applications for a user
 */
export async function prefetchApplications(userId: string): Promise<void> {
  // Only prefetch if user is authenticated
  if (!isAuthenticated() || !userId) {
    return;
  }

  try {
    // Check cache first
    const cached = getCachedData(CACHE_KEYS.APPLICATIONS(userId));
    if (cached) {
      return; // Already cached
    }

    // Fetch in background
    const applications = await getUserApplications(userId);
    setCachedData(CACHE_KEYS.APPLICATIONS(userId), applications, CACHE_TTL.MEDIUM);
  } catch (error: any) {
    // Only log non-permission errors (permission errors are expected if not authenticated)
    if (error?.code !== 'permission-denied' && error?.code !== 'missing-or-insufficient-permissions') {
      console.error('Error prefetching applications:', error);
    }
  }
}

/**
 * Prefetch contacts for a user
 */
export async function prefetchContacts(userId: string): Promise<void> {
  // Only prefetch if user is authenticated
  if (!isAuthenticated() || !userId) {
    return;
  }

  try {
    const cached = getCachedData(CACHE_KEYS.CONTACTS(userId));
    if (cached) {
      return;
    }

    const contacts = await getContacts(userId);
    setCachedData(CACHE_KEYS.CONTACTS(userId), contacts, CACHE_TTL.MEDIUM);
  } catch (error: any) {
    // Only log non-permission errors (permission errors are expected if not authenticated)
    if (error?.code !== 'permission-denied' && error?.code !== 'missing-or-insufficient-permissions') {
      console.error('Error prefetching contacts:', error);
    }
  }
}

/**
 * Prefetch CVs for a user
 */
export async function prefetchCVs(userId: string): Promise<void> {
  // Only prefetch if user is authenticated
  if (!isAuthenticated() || !userId) {
    return;
  }

  try {
    const cached = getCachedData(CACHE_KEYS.CVS(userId));
    if (cached) {
      return;
    }

    const cvs = await getUserCVs(userId);
    setCachedData(CACHE_KEYS.CVS(userId), cvs, CACHE_TTL.LONG);
  } catch (error: any) {
    // Only log non-permission errors (permission errors are expected if not authenticated)
    if (error?.code !== 'permission-denied' && error?.code !== 'missing-or-insufficient-permissions') {
      console.error('Error prefetching CVs:', error);
    }
  }
}

/**
 * Prefetch all user data
 */
export async function prefetchAllUserData(userId: string): Promise<void> {
  // Prefetch in parallel (non-blocking)
  Promise.all([
    prefetchApplications(userId),
    prefetchContacts(userId),
    prefetchCVs(userId),
  ]).catch((error) => {
    console.error('Error prefetching user data:', error);
  });
}

/**
 * Prefetch data when user hovers over navigation link
 */
export function prefetchOnHover(route: string, userId: string | undefined): void {
  // Don't prefetch if no user ID
  if (!userId || !isAuthenticated()) {
    return;
  }

  // Use requestIdleCallback if available, otherwise setTimeout
  const schedule = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100));

  schedule(() => {
    switch (route) {
      case '/applications':
        prefetchApplications(userId);
        break;
      case '/networking':
        prefetchContacts(userId);
        break;
      case '/cv-manager':
        prefetchCVs(userId);
        break;
      default:
        break;
    }
  });
}

