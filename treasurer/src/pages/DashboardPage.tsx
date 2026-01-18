import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { increment, decrement, selectCount } from '@/store/features/counterSlice'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

/**
 * Dashboard page component with Redux example.
 */
export function DashboardPage() {
  const count = useAppSelector(selectCount)
  const dispatch = useAppDispatch()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Redux Counter Example</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-2xl font-semibold text-gray-900">{count}</p>
            <div className="flex gap-2">
              <Button onClick={() => dispatch(decrement())} variant="outline">
                -
              </Button>
              <Button onClick={() => dispatch(increment())}>+</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">$12,450.00</p>
            <p className="mt-1 text-sm text-gray-500">+2.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No recent transactions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
