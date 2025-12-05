'use client';

import { useTheme } from '@/context/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <MoonIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      ) : (
        <SunIcon className="w-6 h-6 text-yellow-500" />
      )}
    </button>
  );
}
