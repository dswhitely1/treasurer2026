import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright E2E tests.
 *
 * This runs once before all test suites.
 * Use for:
 * - Database seeding
 * - Authentication token caching
 * - Global state initialization
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test suite setup...')

  const baseURL = config.use?.baseURL || 'http://localhost:3000'

  // Verify that the frontend and backend are running
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    console.log('✓ Verifying frontend is accessible...')
    const frontendResponse = await page.goto(baseURL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    if (!frontendResponse || !frontendResponse.ok()) {
      throw new Error(
        `Frontend not accessible at ${baseURL}. Make sure the dev server is running.`
      )
    }

    console.log('✓ Frontend is accessible')

    // Verify API is accessible
    console.log('✓ Verifying API is accessible...')
    const apiURL = process.env.VITE_API_URL || 'http://localhost:3001/api'
    const healthCheckURL = apiURL.replace('/api', '/health')

    try {
      const apiResponse = await page.request.get(healthCheckURL)
      if (!apiResponse.ok()) {
        throw new Error(`API health check failed`)
      }
      console.log('✓ API is accessible')
    } catch (error) {
      throw new Error(
        `API not accessible at ${healthCheckURL}. Make sure the API server is running.`
      )
    }

    console.log('✅ All systems ready for E2E tests')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
