import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook for intelligent route prefetching
 * Prefetches commonly accessed routes when user hovers over navigation links
 * or when they're likely to navigate to them
 */

// Routes to prefetch (most commonly accessed)
const PREFETCH_ROUTES = [
  '/dashboard',
  '/applications',
  '/analytics',
  '/cv-manager',
  '/networking',
] as const;

// Prefetch delay to avoid prefetching too early
const PREFETCH_DELAY = 200; // ms

/**
 * Prefetch a route by dynamically importing it
 */
function prefetchRoute(route: string) {
  // Map routes to their lazy-loaded components
  const routeMap: Record<string, () => Promise<any>> = {
    '/dashboard': () => import('../pages/Dashboard'),
    '/applications': () => import('../pages/Applications'),
    '/analytics': () => import('../pages/Analytics'),
    '/cv-manager': () => import('../pages/CVManager'),
    '/networking': () => import('../pages/Networking'),
    '/calendar': () => import('../pages/Calendar'),
    '/archived': () => import('../pages/Archived'),
    '/job-search': () => import('../pages/JobSearch'),
    '/settings': () => import('../pages/Settings'),
  };

  const prefetchFn = routeMap[route];
  if (prefetchFn) {
    prefetchFn().catch((err) => {
      // Silently fail - prefetching is optional
      console.debug('Prefetch failed for route:', route, err);
    });
  }
}

/**
 * Hook to prefetch routes on mount (for likely next routes)
 */
export function usePrefetchOnMount() {
  const location = useLocation();

  useEffect(() => {
    // Prefetch likely next routes after a delay
    const timer = setTimeout(() => {
      // Prefetch routes that are commonly accessed from current route
      const currentRoute = location.pathname;
      
      // Prefetch common routes (excluding current route)
      PREFETCH_ROUTES.forEach((route) => {
        if (route !== currentRoute) {
          prefetchRoute(route);
        }
      });
    }, PREFETCH_DELAY);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}

/**
 * Hook to prefetch a route on hover
 * Use this on navigation links
 */
export function usePrefetchOnHover(route: string) {
  const handleMouseEnter = () => {
    // Small delay to avoid prefetching on accidental hovers
    const timer = setTimeout(() => {
      prefetchRoute(route);
    }, PREFETCH_DELAY);

    return () => clearTimeout(timer);
  };

  return {
    onMouseEnter: handleMouseEnter,
  };
}

/**
 * Prefetch a specific route immediately
 */
export function prefetchRouteNow(route: string) {
  prefetchRoute(route);
}

