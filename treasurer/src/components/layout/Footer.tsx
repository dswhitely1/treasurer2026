/**
 * Application footer component.
 */
export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {currentYear} Treasurer. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
