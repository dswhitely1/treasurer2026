import { useState, useEffect } from 'react'
import { Button, Card } from '@/components/ui'
import { DateRangePicker } from './DateRangePicker'
import { useTransactionExport } from './useTransactionExport'

interface ExportTransactionsPanelProps {
  orgId: string
  accountId: string
  accountName: string
}

export function ExportTransactionsPanel({
  orgId,
  accountId,
  accountName,
}: ExportTransactionsPanelProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const { exportTransactions, isLoading, error, clearError } =
    useTransactionExport({
      orgId,
      accountId,
      accountName,
    })

  // Validate date range
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (start >= end) {
        setDateError('Start date must be before end date')
      } else {
        setDateError(null)
      }
    } else {
      setDateError(null)
    }
  }, [startDate, endDate])

  // Auto-close success message
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const handleExport = async () => {
    if (dateError) return

    const result = await exportTransactions({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })

    if (result.success) {
      setShowSuccess(true)
      // Auto-collapse panel after successful export
      setTimeout(() => {
        setIsPanelOpen(false)
      }, 2000)
    }
  }

  const hasValidationErrors = !!dateError

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
        aria-expanded={isPanelOpen}
        aria-controls="export-panel-content"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span className="text-lg font-semibold text-gray-900">
            Export Transactions
          </span>
        </div>
        <svg
          className={`h-5 w-5 text-gray-600 transition-transform ${isPanelOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isPanelOpen && (
        <div id="export-panel-content" className="border-t border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Date Range (Optional)
              </h3>
              <p className="mb-3 text-sm text-gray-600">
                Leave dates empty to export all transactions
              </p>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(date) => {
                  setStartDate(date)
                  clearError()
                }}
                onEndDateChange={(date) => {
                  setEndDate(date)
                  clearError()
                }}
                error={dateError ?? undefined}
              />
            </div>

            {error && (
              <div
                className="rounded-md bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}

            {showSuccess && (
              <div
                className="rounded-md bg-green-50 p-3 text-sm text-green-800"
                role="alert"
                aria-live="polite"
              >
                Export complete! Check your downloads folder.
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPanelOpen(false)
                  setStartDate('')
                  setEndDate('')
                  clearError()
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleExport()}
                disabled={isLoading || hasValidationErrors}
                className={isLoading ? 'cursor-wait' : ''}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export to Excel
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
