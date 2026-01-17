import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'

/**
 * Home page component - landing page for the application.
 */
export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Welcome to{' '}
          <span className="text-blue-600">Treasurer</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Your comprehensive financial management solution. Track expenses,
          manage budgets, and gain insights into your financial health.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/dashboard">
            <Button size="lg">Get Started</Button>
          </Link>
          <Button variant="outline" size="lg">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  )
}

export default HomePage
