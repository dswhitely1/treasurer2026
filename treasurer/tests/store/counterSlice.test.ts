import { describe, it, expect } from 'vitest'
import counterReducer, {
  increment,
  decrement,
  incrementByAmount,
  reset,
} from '@/store/features/counterSlice'

describe('counterSlice', () => {
  const initialState = { value: 0 }

  it('should return the initial state', () => {
    expect(counterReducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should handle increment', () => {
    const actual = counterReducer(initialState, increment())
    expect(actual.value).toBe(1)
  })

  it('should handle decrement', () => {
    const actual = counterReducer(initialState, decrement())
    expect(actual.value).toBe(-1)
  })

  it('should handle incrementByAmount', () => {
    const actual = counterReducer(initialState, incrementByAmount(5))
    expect(actual.value).toBe(5)
  })

  it('should handle reset', () => {
    const stateWithValue = { value: 42 }
    const actual = counterReducer(stateWithValue, reset())
    expect(actual.value).toBe(0)
  })

  it('should handle multiple increments', () => {
    let state = counterReducer(initialState, increment())
    state = counterReducer(state, increment())
    state = counterReducer(state, increment())
    expect(state.value).toBe(3)
  })
})
