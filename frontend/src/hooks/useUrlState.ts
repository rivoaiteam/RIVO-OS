import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

interface UseUrlStateOptions {
  defaultValue?: string
}

/**
 * Hook to sync state with URL query parameters.
 * Enables deep linking to filtered views.
 */
export function useUrlState(
  key: string,
  options: UseUrlStateOptions = {}
): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const { defaultValue = '' } = options

  const value = useMemo(() => {
    return searchParams.get(key) ?? defaultValue
  }, [searchParams, key, defaultValue])

  const setValue = useCallback(
    (newValue: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (newValue === defaultValue || newValue === '') {
            next.delete(key)
          } else {
            next.set(key, newValue)
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams, key, defaultValue]
  )

  return [value, setValue]
}

/**
 * Hook to manage multiple URL state values at once.
 * Useful for pages with multiple filters.
 */
export function useUrlFilters<T extends Record<string, string>>(
  defaults: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const values = useMemo(() => {
    const result = { ...defaults }
    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const param = searchParams.get(key as string)
      if (param !== null) {
        result[key] = param as T[keyof T]
      }
    }
    return result
  }, [searchParams, defaults])

  const setValues = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(updates)) {
            if (value === defaults[key as keyof T] || value === '' || value === null) {
              next.delete(key)
            } else {
              next.set(key, value as string)
            }
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams, defaults]
  )

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  return [values, setValues, resetFilters]
}
