import { getAuthToken } from '../api'

export interface ExportTransactionsParams {
  orgId: string
  accountId: string
  startDate?: string
  endDate?: string
  statuses?: ('UNCLEARED' | 'CLEARED' | 'RECONCILED')[]
  includeDeleted?: boolean
}

/**
 * Export transactions to Excel format
 */
export async function exportTransactionsToExcel(
  params: ExportTransactionsParams
): Promise<Blob> {
  const { orgId, accountId, startDate, endDate, statuses, includeDeleted } =
    params

  // Build query string
  const queryParams = new URLSearchParams()

  // Convert date strings to ISO 8601 datetime format
  if (startDate) {
    const startDateTime = new Date(startDate)
    startDateTime.setHours(0, 0, 0, 0) // Start of day
    queryParams.append('startDate', startDateTime.toISOString())
  }
  if (endDate) {
    const endDateTime = new Date(endDate)
    endDateTime.setHours(23, 59, 59, 999) // End of day
    queryParams.append('endDate', endDateTime.toISOString())
  }
  if (statuses) {
    statuses.forEach((status) => queryParams.append('statuses', status))
  }
  if (includeDeleted) queryParams.append('includeDeleted', 'true')

  const url = `${import.meta.env.VITE_API_URL}/organizations/${orgId}/accounts/${accountId}/transactions/export?${queryParams.toString()}`

  const token = getAuthToken()
  if (!token) {
    throw new Error('No authentication token')
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    // Try to parse error message
    let errorMessage = `Export failed (${response.status})`
    try {
      const errorData = (await response.json()) as { message?: string }
      errorMessage = errorData.message ?? errorMessage
    } catch {
      // If JSON parsing fails, use default message
    }
    throw new Error(errorMessage)
  }

  return await response.blob()
}

/**
 * Trigger browser download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  accountName: string,
  startDate?: string,
  endDate?: string
): string {
  const sanitizedName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_')

  let dateRange = 'All_Time'
  if (startDate && endDate) {
    const start = new Date(startDate).toISOString().split('T')[0]
    const end = new Date(endDate).toISOString().split('T')[0]
    dateRange = `${start}_to_${end}`
  }

  return `${sanitizedName}_Transactions_${dateRange}.xlsx`
}
