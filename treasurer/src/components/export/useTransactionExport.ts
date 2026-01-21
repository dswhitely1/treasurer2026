import { useState, useCallback } from 'react'
import {
  exportTransactionsToExcel,
  downloadBlob,
  generateExportFilename,
  type ExportTransactionsParams,
} from '@/lib/api/export'

interface UseTransactionExportOptions {
  orgId: string
  accountId: string
  accountName: string
}

export function useTransactionExport({
  orgId,
  accountId,
  accountName,
}: UseTransactionExportOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportTransactions = useCallback(
    async (params: Omit<ExportTransactionsParams, 'orgId' | 'accountId'>) => {
      setIsLoading(true)
      setError(null)

      try {
        const blob = await exportTransactionsToExcel({
          orgId,
          accountId,
          ...params,
        })

        const filename = generateExportFilename(
          accountName,
          params.startDate,
          params.endDate
        )

        downloadBlob(blob, filename)

        return { success: true }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Export failed. Please try again.'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, accountId, accountName]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    exportTransactions,
    isLoading,
    error,
    clearError,
  }
}
