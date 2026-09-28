// src/utils/useMobileLayout.ts
// Hook to manage responsive viewport breakpoints and scroll-aware navigation.
// Breakpoints:
// - Mobile vertical: width <= 640px
// - Mobile landscape: height <= 500px && orientation landscape
// - Tablet: width > 640px && width <= 1024px
// - Desktop: width > 1024px

import { useState, useEffect } from 'react';

export interface MobileLayoutState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscapeMobile: boolean;
  showHeader: boolean;
}

export function useMobileLayout(): MobileLayoutState {
  const [layoutState, setLayoutState] = useState<MobileLayoutState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLandscapeMobile: false,
        showHeader: true,
      };
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscapeMobile = h <= 500 && w > h;
    const isMobile = w <= 640 || isLandscapeMobile;
    const isTablet = w > 640 && w <= 1024 && !isLandscapeMobile;
    const isDesktop = w > 1024 && !isLandscapeMobile;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isLandscapeMobile,
      showHeader: true,
    };
  });

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscapeMobile = h <= 500 && w > h;
      const isMobile = w <= 640 || isLandscapeMobile;
      const isTablet = w > 640 && w <= 1024 && !isLandscapeMobile;
      const isDesktop = w > 1024 && !isLandscapeMobile;

      setLayoutState((prev) => ({
        ...prev,
        isMobile,
        isTablet,
        isDesktop,
        isLandscapeMobile,
      }));
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      // Always show at top
      if (currentScrollY <= 20) {
        setLayoutState((prev) => (prev.showHeader ? prev : { ...prev, showHeader: true }));
      } else if (delta > 8) {
        // Scrolling down -> hide compact header
        setLayoutState((prev) => (!prev.showHeader ? prev : { ...prev, showHeader: false }));
      } else if (delta < -8) {
        // Scrolling up -> reveal compact header
        setLayoutState((prev) => (prev.showHeader ? prev : { ...prev, showHeader: true }));
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return layoutState;
}
