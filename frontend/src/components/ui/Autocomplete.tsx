'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface AutocompleteOption {
  value: string;
  label: string;
  [key: string]: any;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  fetchSuggestions: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  minChars?: number;
  debounceMs?: number;
}

export default function Autocomplete({
  value,
  onChange,
  onSelect,
  fetchSuggestions,
  placeholder = 'Type to search...',
  className = '',
  disabled = false,
  required = false,
  minChars = 0,
  debounceMs = 300,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFocusedRef = useRef(false);
  const justSelectedRef = useRef(false);
  const fetchRef = useRef(fetchSuggestions);

  // Keep fetchRef up to date without triggering effects
  fetchRef.current = fetchSuggestions;

  // Calculate dropdown position based on input element
  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < 320 && rect.top > spaceBelow;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      zIndex: 9999,
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        // Also check if click was on the portal dropdown
        const dropdown = document.getElementById('autocomplete-dropdown');
        if (dropdown && dropdown.contains(event.target as Node)) return;
        setIsOpen(false);
        isFocusedRef.current = false;
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position on scroll/resize when open
  useEffect(() => {
    if (!isOpen) return;
    const handlePositionUpdate = () => updateDropdownPosition();
    window.addEventListener('scroll', handlePositionUpdate, true);
    window.addEventListener('resize', handlePositionUpdate);
    return () => {
      window.removeEventListener('scroll', handlePositionUpdate, true);
      window.removeEventListener('resize', handlePositionUpdate);
    };
  }, [isOpen, updateDropdownPosition]);

  // Fetch suggestions with debounce - only when user is interacting
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only fetch if user has focused the input
    if (!isFocusedRef.current) {
      return;
    }

    // Skip if user just selected an option (prevents dropdown reopening)
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (value.length < minChars) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await fetchRef.current(value);
        setSuggestions(results);
        // Only open if still focused
        if (isFocusedRef.current) {
          setIsOpen(results.length > 0);
          if (results.length > 0) updateDropdownPosition();
        }
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, minChars, debounceMs, updateDropdownPosition]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    onChange(e.target.value);
  };

  const handleSelect = (option: AutocompleteOption) => {
    justSelectedRef.current = true;
    isFocusedRef.current = false;
    setIsOpen(false);
    setSelectedIndex(-1);
    setSuggestions([]);
    onChange(option.value);
    if (onSelect) {
      onSelect(option);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Always handle Enter for QR codes — even if dropdown is closed or no suggestions
    if (e.key === 'Enter') {
      e.preventDefault();
      // Check both React state value AND the actual DOM input value (scanner may outpace React)
      const inputValue = e.currentTarget.value || value;
      if (inputValue.includes('NEXUS-STEP|')) {
        justSelectedRef.current = true;
        isFocusedRef.current = false;
        setIsOpen(false);
        setSuggestions([]);
        onChange(inputValue); // Sync React state with actual input
        if (onSelect) {
          onSelect({ value: inputValue, label: inputValue });
        }
        return;
      }
      // Normal Enter handling
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        const exactMatch = suggestions.find(s => s.value.toLowerCase() === value.toLowerCase() || s.label.toLowerCase() === value.toLowerCase());
        handleSelect(exactMatch || suggestions[0]);
      } else if (value) {
        setIsOpen(false);
        if (onSelect) {
          onSelect({ value, label: value });
        }
      }
      return;
    }

    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = async () => {
    isFocusedRef.current = true;
    updateDropdownPosition();
    // Show suggestions on focus if meets min chars
    if (value.length >= minChars || minChars === 0) {
      setIsLoading(true);
      try {
        const results = await fetchRef.current(value);
        setSuggestions(results);
        if (results.length > 0) {
          updateDropdownPosition();
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions on focus:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        isFocusedRef.current = false;
      }
    }, 200);
  };

  const dropdownContent = isOpen && suggestions.length > 0 ? (
    <ul
      id="autocomplete-dropdown"
      style={dropdownStyle}
      className="bg-white dark:bg-slate-800 border-2 border-blue-200 dark:border-blue-700 rounded-lg shadow-2xl max-h-80 overflow-y-auto"
    >
      {suggestions.map((option, index) => (
        <li
          key={option.value + index}
          onClick={() => handleSelect(option)}
          className={`px-4 py-2 cursor-pointer transition-colors ${
            index === selectedIndex
              ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200'
              : 'hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200'
          }`}
        >
          <div className="font-medium">{option.label}</div>
          {option.description && (
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{option.description}</div>
          )}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
        autoComplete="off"
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg
            className="animate-spin h-5 w-5 text-gray-400 dark:text-slate-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}

      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
