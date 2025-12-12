import { useState, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Hook to detect if device is mobile
 * Returns true if screen width is below 'md' breakpoint (960px)
 */
export const useMobile = (): boolean => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
};

/**
 * Hook to detect if device is a touch device
 */
export const useTouchDevice = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
};

/**
 * Hook to detect if app is installed as PWA
 */
export const usePWAInstalled = (): boolean => {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running as standalone (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true ||
                         document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);
  }, []);

  return isInstalled;
};

/**
 * Hook to request PWA installation
 */
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true ||
                         document.referrer.includes('android-app://');
    
    if (isStandalone) {
      setIsInstallable(false);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('✅ PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also check periodically if prompt becomes available
    // (useful for mobile Chrome which may delay the prompt)
    const checkInterval = setInterval(() => {
      // This is a workaround: Chrome mobile may not fire beforeinstallprompt
      // immediately, but we can still show install option in menu
      if (!isStandalone && !deferredPrompt) {
        // On mobile, we can still show install option even without beforeinstallprompt
        // The user can use browser menu to install
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          setIsInstallable(true);
        }
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearInterval(checkInterval);
    };
  }, [deferredPrompt]);

  const install = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        setDeferredPrompt(null);
        setIsInstallable(false);

        return outcome === 'accepted';
      } catch (error) {
        console.error('Error during PWA installation:', error);
        return false;
      }
    }
    
    // Fallback: return false so UI can show manual instructions
    return false;
  };

  return { install, isInstallable };
};

