import { Link } from 'react-router-dom'

import { Button } from '@/components/ui'

/**
 * 404 Not Found page component.
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          404 error
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className="mt-10">
          <Link to="/">
            <Button>Go back home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
