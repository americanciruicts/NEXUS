'use client';

import { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export default function Layout({ children, fullWidth = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main className={fullWidth ? "py-4 px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8"}>
        {children}
      </main>
    </div>
  );
}