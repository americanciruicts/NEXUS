'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Global keyboard shortcuts for NEXUS.
 * Cmd/Ctrl+K → Search (handled by GlobalSearch)
 * Cmd/Ctrl+Shift+N → New Traveler
 * Cmd/Ctrl+Shift+D → Dashboard
 * Cmd/Ctrl+Shift+L → Labor Tracking
 * Cmd/Ctrl+Shift+T → Travelers list
 * Cmd/Ctrl+Shift+A → Analytics
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            router.push('/travelers/new');
            break;
          case 'd':
            e.preventDefault();
            router.push('/dashboard');
            break;
          case 'l':
            e.preventDefault();
            router.push('/labor-tracking');
            break;
          case 't':
            e.preventDefault();
            router.push('/travelers');
            break;
          case 'a':
            e.preventDefault();
            router.push('/analytics');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router]);
}
