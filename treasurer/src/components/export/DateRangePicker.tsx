interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  error?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  error,
}: DateRangePickerProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="export-start-date"
            className="block text-sm font-medium text-gray-700"
          >
            Start Date
          </label>
          <input
            id="export-start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            aria-describedby={error ? 'date-range-error' : undefined}
          />
        </div>

        <div>
          <label
            htmlFor="export-end-date"
            className="block text-sm font-medium text-gray-700"
          >
            End Date
          </label>
          <input
            id="export-end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            aria-describedby={error ? 'date-range-error' : undefined}
          />
        </div>
      </div>

      {error && (
        <p id="date-range-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
