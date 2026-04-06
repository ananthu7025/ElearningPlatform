'use client';
import { useState, useCallback, useEffect } from 'react';

const LAYOUT_BREAKPOINT = 1200;

/**
 * useMenu
 * ────────────────────────────────────────────
 * React hook replacing the static `menu.js` for sidebar/menu state.
 *
 * Manages:
 * - Mobile menu expanded/collapsed
 * - Desktop sidebar collapsed/expanded
 * - CSS class toggling on the root <html> element
 */
export function useMenu() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // mobile overlay
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Track screen size
  useEffect(() => {
    const check = () => {
      const small = window.innerWidth < LAYOUT_BREAKPOINT;
      setIsSmallScreen(small);
      // Close mobile menu when going to desktop
      if (!small) setIsExpanded(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync CSS classes to <html> element (Vuexy layout system reads these)
  useEffect(() => {
    const root = document.documentElement;
    if (isSmallScreen) {
      root.classList.toggle('layout-menu-expanded', isExpanded);
      root.classList.remove('layout-menu-collapsed');
    } else {
      root.classList.toggle('layout-menu-collapsed', isCollapsed);
      root.classList.remove('layout-menu-expanded');
    }
  }, [isSmallScreen, isCollapsed, isExpanded]);

  const toggleMenu = useCallback(() => {
    if (isSmallScreen) {
      setIsExpanded((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isSmallScreen]);

  const closeMenu = useCallback(() => {
    if (isSmallScreen) setIsExpanded(false);
  }, [isSmallScreen]);

  return {
    isCollapsed,
    isExpanded,
    isSmallScreen,
    toggleMenu,
    closeMenu,
  };
}
