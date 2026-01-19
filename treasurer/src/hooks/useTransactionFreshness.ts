import { useMemo } from 'react'
import type { VersionedTransaction } from '@/types'

/**
 * Threshold in milliseconds after which data is considered stale.
 * Default: 5 minutes (300000ms)
 */
const DEFAULT_STALE_THRESHOLD_MS = 5 * 60 * 1000

/**
 * Threshold in milliseconds for warning about old data.
 * Default: 24 hours
 */
const DEFAULT_OLD_DATA_THRESHOLD_MS = 24 * 60 * 60 * 1000

/**
 * Freshness status of transaction data.
 */
export type FreshnessStatus = 'fresh' | 'stale' | 'old'

/**
 * Freshness information for a transaction.
 */
export interface TransactionFreshness {
  /** The freshness status */
  status: FreshnessStatus
  /** Human-readable description of when data was last updated */
  lastUpdatedText: string
  /** Whether to show a warning to the user */
  showWarning: boolean
  /** Warning message to display (if applicable) */
  warningMessage: string | null
  /** Time since last update in milliseconds */
  timeSinceUpdateMs: number
}

/**
 * Options for useTransactionFreshness hook.
 */
interface UseTransactionFreshnessOptions {
  /** Threshold in ms after which data is stale (default: 5 minutes) */
  staleThresholdMs?: number
  /** Threshold in ms after which data is considered old (default: 24 hours) */
  oldDataThresholdMs?: number
}

/**
 * Format time difference to human-readable text.
 */
function formatTimeDifference(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }
  return 'Just now'
}

/**
 * Custom hook to check the freshness of transaction data.
 * Helps determine if data might be stale and warns users before editing old data.
 *
 * @example
 * ```tsx
 * const freshness = useTransactionFreshness(transaction)
 *
 * if (freshness.showWarning) {
 *   console.warn(freshness.warningMessage)
 * }
 * ```
 */
export function useTransactionFreshness(
  transaction: VersionedTransaction | null,
  options: UseTransactionFreshnessOptions = {}
): TransactionFreshness {
  const {
    staleThresholdMs = DEFAULT_STALE_THRESHOLD_MS,
    oldDataThresholdMs = DEFAULT_OLD_DATA_THRESHOLD_MS,
  } = options

  return useMemo(() => {
    if (!transaction) {
      return {
        status: 'fresh' as FreshnessStatus,
        lastUpdatedText: 'Unknown',
        showWarning: false,
        warningMessage: null,
        timeSinceUpdateMs: 0,
      }
    }

    const now = Date.now()
    const updatedAt = new Date(transaction.updatedAt).getTime()
    const timeSinceUpdateMs = now - updatedAt

    let status: FreshnessStatus = 'fresh'
    let showWarning = false
    let warningMessage: string | null = null

    if (timeSinceUpdateMs > oldDataThresholdMs) {
      status = 'old'
      showWarning = true
      warningMessage =
        'This transaction was last updated more than 24 hours ago. ' +
        'Consider refreshing the data before making changes.'
    } else if (timeSinceUpdateMs > staleThresholdMs) {
      status = 'stale'
      showWarning = true
      warningMessage =
        'This transaction data may be stale. ' +
        'Another user might have made changes since you loaded it.'
    }

    return {
      status,
      lastUpdatedText: formatTimeDifference(timeSinceUpdateMs),
      showWarning,
      warningMessage,
      timeSinceUpdateMs,
    }
  }, [transaction, staleThresholdMs, oldDataThresholdMs])
}

/**
 * Check if two transactions have different versions (conflict potential).
 */
export function useVersionComparison(
  localTransaction: VersionedTransaction | null,
  serverVersion: number | null
): {
  hasVersionMismatch: boolean
  localVersion: number
  serverVersion: number | null
  versionDifference: number
} {
  return useMemo(() => {
    const localVersion = localTransaction?.version ?? 0

    if (serverVersion === null) {
      return {
        hasVersionMismatch: false,
        localVersion,
        serverVersion: null,
        versionDifference: 0,
      }
    }

    const versionDifference = serverVersion - localVersion

    return {
      hasVersionMismatch: versionDifference > 0,
      localVersion,
      serverVersion,
      versionDifference,
    }
  }, [localTransaction, serverVersion])
}
