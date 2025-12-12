import { useState, useEffect, useRef, RefObject } from 'react';

/**
 * Hook for progressive loading of content
 * Uses Intersection Observer to load content when it enters the viewport
 * 
 * @param options - Configuration options
 * @param options.threshold - Threshold for intersection (0-1, default: 0.1)
 * @param options.rootMargin - Root margin for intersection observer (default: '50px')
 * @param options.enabled - Whether progressive loading is enabled (default: true)
 * @returns Object with ref to attach to element and isVisible state
 */
export function useProgressiveLoad<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}): {
  ref: RefObject<T | null>;
  isVisible: boolean;
} {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true,
  } = options || {};

  const [isVisible, setIsVisible] = useState(!enabled); // If disabled, always visible
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately if Intersection Observer is not supported
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Unobserve after first intersection to avoid unnecessary re-renders
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [enabled, threshold, rootMargin]);

  return { ref, isVisible };
}

/**
 * Hook for loading content with priority
 * High priority content loads immediately, low priority loads after a delay
 * 
 * @param priority - 'high' | 'low' (default: 'high')
 * @param delay - Delay in ms for low priority content (default: 100)
 * @returns Whether content should be loaded
 */
export function usePriorityLoad(priority: 'high' | 'low' = 'high', delay: number = 100): boolean {
  const [shouldLoad, setShouldLoad] = useState(priority === 'high');

  useEffect(() => {
    if (priority === 'high') {
      setShouldLoad(true);
      return;
    }

    // Low priority: load after delay
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [priority, delay]);

  return shouldLoad;
}

