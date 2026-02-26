'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/config/api';
import {
  UserIcon,
  DocumentTextIcon,
  ClockIcon,
  BriefcaseIcon
} from '@heroicons/react/24/solid';

interface SearchResult {
  id: number;
  type: 'traveler' | 'user' | 'work_order' | 'labor';
  title: string;
  subtitle: string;
  description: string;
  url: string;
  status: string;
  metadata?: Record<string, string | number | boolean | null>;
}

interface SearchResponse {
  query: string;
  results: {
    travelers: SearchResult[];
    users: SearchResult[];
    work_orders: SearchResult[];
    labor_entries: SearchResult[];
  };
  total_results: number;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('nexus_token');
      const response = await fetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(searchQuery)}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAllResults = (): SearchResult[] => {
    if (!results) return [];
    return [
      ...results.results.travelers,
      ...results.results.users,
      ...results.results.work_orders,
      ...results.results.labor_entries
    ];
  };

  const handleNavigate = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
    setResults(null);
  };

  const handleKeyNavigation = (event: React.KeyboardEvent) => {
    const allResults = getAllResults();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && allResults[selectedIndex]) {
      event.preventDefault();
      handleNavigate(allResults[selectedIndex]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'traveler':
        return <DocumentTextIcon className="h-5 w-5 text-blue-600" />;
      case 'user':
        return <UserIcon className="h-5 w-5 text-green-600" />;
      case 'work_order':
        return <BriefcaseIcon className="h-5 w-5 text-purple-600" />;
      case 'labor':
        return <ClockIcon className="h-5 w-5 text-orange-600" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'CREATED': 'bg-gray-100 text-gray-700',
      'IN_PROGRESS': 'bg-blue-100 text-blue-700',
      'COMPLETED': 'bg-green-100 text-green-700',
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-gray-100 text-gray-700',
      'in_progress': 'bg-yellow-100 text-yellow-700',
      'completed': 'bg-green-100 text-green-700'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const renderResults = () => {
    if (!results || results.total_results === 0) {
      if (query.length >= 2) {
        return (
          <div className="px-4 py-8 text-center text-gray-500">
            <p className="text-sm">No results found for &quot;{query}&quot;</p>
          </div>
        );
      }
      return null;
    }

    let currentIndex = 0;

    return (
      <div className="max-h-[500px] overflow-y-auto">
        {/* Travelers */}
        {results.results.travelers.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Travelers ({results.results.travelers.length})
            </div>
            {results.results.travelers.map((result) => {
              const isSelected = currentIndex === selectedIndex;
              currentIndex++;
              return (
                <button
                  key={`traveler-${result.id}`}
                  onClick={() => handleNavigate(result)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
                      <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                      <p className="text-xs text-gray-500 mt-1">{result.description}</p>
                      <div className="mt-2">{getStatusBadge(result.status)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Users */}
        {results.results.users.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Users ({results.results.users.length})
            </div>
            {results.results.users.map((result) => {
              const isSelected = currentIndex === selectedIndex;
              currentIndex++;
              return (
                <button
                  key={`user-${result.id}`}
                  onClick={() => handleNavigate(result)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
                      <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                      <p className="text-xs text-gray-500 mt-1">{result.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Work Orders */}
        {results.results.work_orders.length > 0 && (
          <div className="border-b border-gray-200">
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Work Orders ({results.results.work_orders.length})
            </div>
            {results.results.work_orders.map((result) => {
              const isSelected = currentIndex === selectedIndex;
              currentIndex++;
              return (
                <button
                  key={`work_order-${result.id}`}
                  onClick={() => handleNavigate(result)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
                      <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                      <p className="text-xs text-gray-500 mt-1">{result.description}</p>
                      <div className="mt-2">{getStatusBadge(result.status)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Labor Entries */}
        {results.results.labor_entries.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Labor Entries ({results.results.labor_entries.length})
            </div>
            {results.results.labor_entries.map((result) => {
              const isSelected = currentIndex === selectedIndex;
              currentIndex++;
              return (
                <button
                  key={`labor-${result.id}`}
                  onClick={() => handleNavigate(result)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{getIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
                      <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                      <p className="text-xs text-gray-500 mt-1">{result.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Button/Input */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white/90 hover:text-white border border-white/20"
      >
        <span className="text-sm hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex items-center px-2 py-0.5 text-xs font-semibold text-white/70 bg-white/10 border border-white/20 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />

          {/* Search Panel */}
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50">
            <div className="bg-white rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5 overflow-hidden">
              {/* Search Input */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyNavigation}
                    placeholder="Search travelers, users, work orders..."
                    className="flex-1 outline-none text-gray-900 placeholder-gray-400"
                    autoFocus
                  />
                  {loading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                      setResults(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {renderResults()}

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-semibold">↑↓</kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-semibold">Enter</kbd>
                    <span>Select</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-semibold">Esc</kbd>
                    <span>Close</span>
                  </span>
                </div>
                {results && (
                  <span className="text-gray-600 font-medium">{results.total_results} results</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
