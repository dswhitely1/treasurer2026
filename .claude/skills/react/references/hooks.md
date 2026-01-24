# Hooks Reference

## Contents
- Built-in Hooks Usage
- Custom Hooks in This Codebase
- Hook Anti-Patterns
- Testing Hooks

## Built-in Hooks Usage

### useState for UI State Only

```typescript
// GOOD - UI-only state
function TransactionRow({ transaction }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  // ...
}
```

### useEffect for Side Effects

```typescript
// GOOD - Cleanup pattern
useEffect(() => {
  const controller = new AbortController()
  
  // Side effect with cleanup
  return () => controller.abort()
}, [dependency])
```

## Custom Hooks in This Codebase

### useDebounce

Location: `treasurer/src/hooks/useDebounce.ts`

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}

// Usage in search
const searchTerm = useDebounce(inputValue, 300)
```

### useLocalStorage

Location: `treasurer/src/hooks/useLocalStorage.ts`

```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value
    setStoredValue(valueToStore)
    window.localStorage.setItem(key, JSON.stringify(valueToStore))
  }

  return [storedValue, setValue] as const
}
```

### Typed Redux Hooks

Location: `treasurer/src/store/hooks.ts`

```typescript
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './index'

// ALWAYS use these instead of plain useDispatch/useSelector
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

## Hook Anti-Patterns

### WARNING: Missing Dependency Array Items

**The Problem:**

```typescript
// BAD - Missing userId in deps
useEffect(() => {
  fetchUserData(userId)
}, []) // ESLint will warn
```

**Why This Breaks:**
1. Stale closures capture old `userId` value
2. Effect never re-runs when userId changes
3. Users see wrong data after switching accounts

**The Fix:**

```typescript
// GOOD - All dependencies included
useEffect(() => {
  fetchUserData(userId)
}, [userId])
```

### WARNING: useEffect for Data Fetching

**The Problem:**

```typescript
// BAD - Race conditions, no caching, memory leaks
useEffect(() => {
  fetch(`/api/transactions/${id}`)
    .then(r => r.json())
    .then(setData)
}, [id])
```

**Why This Breaks:**
1. Fast navigation causes stale data overwrites
2. No loading/error states
3. Component unmount during fetch causes setState on unmounted component
4. Every mount triggers new request - no caching

**The Fix:**

Use RTK Query. See the **redux** skill for patterns.

```typescript
// GOOD - Use RTK Query
const { data, isLoading, error } = useGetTransactionQuery(id)
```

### WARNING: State for Derived Values

**The Problem:**

```typescript
// BAD - Unnecessary state sync
const [fullName, setFullName] = useState('')

useEffect(() => {
  setFullName(`${firstName} ${lastName}`)
}, [firstName, lastName])
```

**Why This Breaks:**
1. Extra re-render for every change
2. Sync bugs when updates get out of order
3. More code than necessary

**The Fix:**

```typescript
// GOOD - Compute during render
const fullName = `${firstName} ${lastName}`
```

## Testing Hooks

Use `renderHook` from Testing Library. See the **vitest** skill.

```typescript
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/useDebounce'

describe('useDebounce', () => {
  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    )

    expect(result.current).toBe('initial')
    
    rerender({ value: 'updated' })
    expect(result.current).toBe('initial') // Still old value
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 150))
    })
    expect(result.current).toBe('updated')
  })
})