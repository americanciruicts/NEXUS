'use client';

import { ReactNode } from 'react';
import Header from './Header';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface LayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export default function Layout({ children, fullWidth = false }: LayoutProps) {
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Header />
      <main className={fullWidth ? "py-4 px-3 sm:px-6 lg:px-8" : "max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8"}>
        {children}
      </main>
    </div>
  );
}
