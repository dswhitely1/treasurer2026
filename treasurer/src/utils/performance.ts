import { onCLS, onLCP, onFCP, onTTFB, onINP, type Metric } from 'web-vitals'
import { logger } from './logger'

/**
 * Web Vitals Performance Monitoring
 *
 * Tracks Core Web Vitals and other performance metrics:
 * - CLS (Cumulative Layout Shift): Visual stability
 * - INP (Interaction to Next Paint): Responsiveness
 * - LCP (Largest Contentful Paint): Loading performance
 * - FCP (First Contentful Paint): First render
 * - TTFB (Time to First Byte): Server response time
 */

interface PerformanceThresholds {
  CLS: { good: number; needsImprovement: number }
  INP: { good: number; needsImprovement: number }
  LCP: { good: number; needsImprovement: number }
  FCP: { good: number; needsImprovement: number }
  TTFB: { good: number; needsImprovement: number }
}

// Google's recommended thresholds for Core Web Vitals
const THRESHOLDS: PerformanceThresholds = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  LCP: { good: 2500, needsImprovement: 4000 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
}

type MetricRating = 'good' | 'needs-improvement' | 'poor'

function getRating(metric: Metric): MetricRating {
  const threshold = THRESHOLDS[metric.name as keyof PerformanceThresholds]
  if (!threshold) return 'good'

  if (metric.value <= threshold.good) return 'good'
  if (metric.value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

function handleMetric(metric: Metric) {
  const rating = getRating(metric)

  // Log to structured logger
  logger.debug('Web Vital', {
    metric: metric.name,
    value: metric.value,
    rating,
    id: metric.id,
    navigationType: metric.navigationType,
  })

  // Send to analytics service (e.g., Google Analytics, custom analytics)
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: metric.delta,
      metric_rating: rating,
    })
  }

  // Custom event for monitoring dashboard
  window.dispatchEvent(
    new CustomEvent('web-vital', {
      detail: {
        name: metric.name,
        value: metric.value,
        rating,
        id: metric.id,
      },
    })
  )

  // Warn on poor performance
  if (rating === 'poor') {
    logger.warn('Poor Web Vital performance', {
      metric: metric.name,
      value: metric.value,
      threshold: THRESHOLDS[metric.name as keyof PerformanceThresholds],
    })
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once when your app loads
 */
export function initWebVitals() {
  try {
    onCLS(handleMetric)
    onINP(handleMetric)
    onLCP(handleMetric)
    onFCP(handleMetric)
    onTTFB(handleMetric)

    logger.debug('Web Vitals tracking initialized')
  } catch (error) {
    logger.error('Failed to initialize Web Vitals', { error })
  }
}

/**
 * Performance marker for measuring custom operations
 * Uses Performance API for high-precision timing
 */
export class PerformanceMarker {
  private startMark: string
  private endMark: string
  private measureName: string

  constructor(name: string) {
    this.startMark = `${name}-start`
    this.endMark = `${name}-end`
    this.measureName = name

    if (performance.mark) {
      performance.mark(this.startMark)
    }
  }

  end(): number {
    if (!performance.mark || !performance.measure) {
      return 0
    }

    try {
      performance.mark(this.endMark)
      performance.measure(this.measureName, this.startMark, this.endMark)

      const measure = performance.getEntriesByName(this.measureName)[0]
      const duration = measure?.duration || 0

      // Log slow operations (>16ms = 1 frame at 60fps)
      if (duration > 16) {
        logger.debug('Slow operation detected', {
          operation: this.measureName,
          duration: duration.toFixed(2),
        })
      }

      // Clean up marks and measures
      performance.clearMarks(this.startMark)
      performance.clearMarks(this.endMark)
      performance.clearMeasures(this.measureName)

      return duration
    } catch (error) {
      logger.error('Performance measurement failed', {
        error,
        operation: this.measureName,
      })
      return 0
    }
  }
}

/**
 * React hook to measure component render performance
 * Usage:
 *   const renderTime = useRenderPerformance('MyComponent')
 */
export function measureRenderPerformance(componentName: string): () => void {
  const marker = new PerformanceMarker(`render-${componentName}`)
  return () => marker.end()
}

/**
 * Track navigation timing
 * Provides detailed information about page load performance
 */
export function getNavigationTiming() {
  if (!performance.getEntriesByType) {
    return null
  }

  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

  if (!navigation) {
    return null
  }

  return {
    // DNS lookup time
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    // TCP connection time
    tcp: navigation.connectEnd - navigation.connectStart,
    // TLS negotiation time
    tls: navigation.secureConnectionStart
      ? navigation.connectEnd - navigation.secureConnectionStart
      : 0,
    // Time to first byte
    ttfb: navigation.responseStart - navigation.requestStart,
    // Download time
    download: navigation.responseEnd - navigation.responseStart,
    // DOM processing time
    domProcessing: navigation.domComplete - navigation.domInteractive,
    // DOM interactive time
    domInteractive: navigation.domInteractive - navigation.fetchStart,
    // DOM complete time
    domComplete: navigation.domComplete - navigation.fetchStart,
    // Load event time
    loadEvent: navigation.loadEventEnd - navigation.loadEventStart,
    // Total page load time
    total: navigation.loadEventEnd - navigation.fetchStart,
  }
}

/**
 * Log navigation timing when available
 */
export function logNavigationTiming() {
  // Wait for page to fully load
  if (document.readyState === 'complete') {
    const timing = getNavigationTiming()
    if (timing) {
      logger.debug('Navigation timing', timing)
    }
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = getNavigationTiming()
        if (timing) {
          logger.debug('Navigation timing', timing)
        }
      }, 0)
    })
  }
}

/**
 * Track resource loading performance
 * Identifies slow-loading resources
 */
export function getSlowResources(threshold = 1000): PerformanceResourceTiming[] {
  if (!performance.getEntriesByType) {
    return []
  }

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  return resources.filter((resource) => resource.duration > threshold)
}

/**
 * Log slow resources
 */
export function logSlowResources(threshold = 1000) {
  const slowResources = getSlowResources(threshold)

  if (slowResources.length > 0) {
    logger.warn(`Found ${slowResources.length} slow resources (>${threshold}ms)`, {
      resources: slowResources.map((r) => ({
        name: r.name,
        duration: r.duration.toFixed(2),
        size: r.transferSize,
        type: r.initiatorType,
      })),
    })
  }
}

// Type declaration for gtag (Google Analytics)
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}
