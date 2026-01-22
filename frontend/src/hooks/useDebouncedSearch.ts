/**
 * Hook for debounced search input with URL state sync.
 */

import { useState, useEffect, useCallback } from 'react'

interface UseDebouncedSearchOptions {
  /** Initial value for the search input */
  initialValue?: string
  /** Debounce delay in milliseconds */
  delay?: number
  /** Callback when debounced value changes */
  onSearch?: (value: string) => void
}

interface UseDebouncedSearchReturn {
  /** Current input value (updates immediately) */
  inputValue: string
  /** Debounced value (updates after delay) */
  debouncedValue: string
  /** Handler for input change */
  setInputValue: (value: string) => void
  /** Clear the search */
  clear: () => void
}

/**
 * Custom hook for debounced search functionality.
 *
 * @example
 * const { inputValue, debouncedValue, setInputValue } = useDebouncedSearch({
 *   initialValue: filters.search,
 *   onSearch: (value) => setFilters({ search: value, page: '1' })
 * })
 */
export function useDebouncedSearch({
  initialValue = '',
  delay = 300,
  onSearch,
}: UseDebouncedSearchOptions = {}): UseDebouncedSearchReturn {
  const [inputValue, setInputValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  // Sync with initial value on mount
  useEffect(() => {
    if (initialValue && initialValue !== inputValue) {
      setInputValue(initialValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce the input value
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== debouncedValue) {
        setDebouncedValue(inputValue)
        onSearch?.(inputValue)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [inputValue, debouncedValue, delay, onSearch])

  const clear = useCallback(() => {
    setInputValue('')
    setDebouncedValue('')
    onSearch?.('')
  }, [onSearch])

  return {
    inputValue,
    debouncedValue,
    setInputValue,
    clear,
  }
}
