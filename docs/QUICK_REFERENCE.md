# Observability Quick Reference

This is a quick reference guide for using the observability features in Treasurer.

## Backend Logging

### Basic Logging

```typescript
import { logger } from '@/utils/logger'

// Standard logging
logger.debug('Debug message', { userId: '123' })
logger.info('User logged in', { email: 'user@example.com' })
logger.warn('High memory usage', { usage: 85 })
logger.error('Database error', { error: error.message })

// Log errors with full context
logError(error, { operation: 'createAccount' })
```

### Performance Tracking

```typescript
import { PerformanceMarker } from '@/utils/logger'

// Time an operation
const marker = new PerformanceMarker('expensive-calculation')
// ... do work ...
const duration = marker.end() // Logs if >1s
```

### Database Query Logging

Automatic slow query logging is enabled. Queries >100ms are logged as warnings.

To use query caching:

```typescript
import { cacheQuery, invalidateCachePattern } from '@/config/prisma-logging'

// Cache a query
const accounts = await cacheQuery(
  `org:${orgId}:accounts`,
  () => prisma.account.findMany({ where: { organizationId: orgId } }),
  60000 // 1 minute TTL
)

// Invalidate cache when data changes
invalidateCachePattern(`org:${orgId}`)
```

## Frontend Logging

### Basic Logging

```typescript
import { logger } from '@/utils/logger'

// Standard logging
logger.debug('Component mounted', { component: 'Dashboard' })
logger.info('Data fetched', { count: 10 })
logger.warn('Slow API response', { duration: 2000 })
logger.error('Failed to save', { error: 'Network error' })

// API errors
logger.apiError('Failed to fetch accounts', error, { endpoint: '/api/accounts' })

// User actions
logger.userAction('button_click', { button: 'submit', form: 'login' })
```

### Error Boundary

Wrap components to catch errors:

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

function MyPage() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  )
}

// Or use HOC
const SafeComponent = withErrorBoundary(MyComponent)
```

### Performance Tracking

```typescript
import { PerformanceMarker } from '@/utils/performance'

// Time an operation
const marker = new PerformanceMarker('data-processing')
// ... do work ...
marker.end() // Logs if >16ms (1 frame at 60fps)
```

## Health Check Endpoints

### Basic Health
```bash
curl http://localhost:3001/health
```

Returns database status, memory usage, and uptime.

### Readiness Probe (Kubernetes)
```bash
curl http://localhost:3001/health/ready
```

Returns 200 if ready to accept traffic (memory <90%).

### Liveness Probe (Kubernetes)
```bash
curl http://localhost:3001/health/live
```

Returns 200 if server is alive.

### Metrics
```bash
curl http://localhost:3001/health/metrics
```

Returns detailed performance metrics including:
- Request statistics (total, by status, by method)
- Response time percentiles (P50, P95, P99)
- Error counts
- System metrics (memory, CPU, uptime)

## Request Tracking

Every request gets a correlation ID via the `X-Request-Id` header. This ID is:

- Automatically generated if not provided
- Included in all log entries
- Returned in the response header

To track a request across services, pass the `X-Request-Id` header:

```bash
curl -H "X-Request-Id: my-custom-id" http://localhost:3001/api/...
```

Then search logs by this ID:

```bash
# In your log aggregator
request.id:"my-custom-id"
```

## Web Vitals

Web Vitals are automatically tracked. You can listen for them:

```typescript
window.addEventListener('web-vital', (event) => {
  const { name, value, rating } = event.detail
  console.log(`${name}: ${value} (${rating})`)
})
```

### Good Thresholds

- **LCP** (Largest Contentful Paint): <2.5s
- **INP** (Interaction to Next Paint): <200ms
- **CLS** (Cumulative Layout Shift): <0.1
- **FCP** (First Contentful Paint): <1.8s
- **TTFB** (Time to First Byte): <800ms

## Common Queries

### Find All Errors

```bash
# In logs
level:"error"
```

### Find Slow Requests

```bash
# In logs
type:"slow_request"
```

### Find Slow Queries

```bash
# In logs
type:"slow_query"
```

### Find Errors by User

```bash
# In logs
level:"error" AND user.id:"<user-id>"
```

### Find Requests by Correlation ID

```bash
# In logs
request.id:"<correlation-id>"
```

## Environment Variables

### Backend

```bash
# Logging level (silent/debug/info/warn/error)
# Automatically set based on NODE_ENV
NODE_ENV=development  # Uses 'debug'
NODE_ENV=production   # Uses 'info'
NODE_ENV=test         # Uses 'silent'
```

### Frontend

```bash
# Development mode enables verbose logging
VITE_NODE_ENV=development
```

## Performance Tips

### Backend

1. **Use caching** for expensive queries
2. **Monitor slow queries** and add indexes
3. **Check memory usage** regularly via `/health`
4. **Review metrics** via `/health/metrics`

### Frontend

1. **Monitor Web Vitals** in production
2. **Check bundle size** after changes: `pnpm build`
3. **Use React.memo** for expensive list items
4. **Lazy load** heavy components

## Troubleshooting

### High Memory Usage

```bash
# Check current memory
curl http://localhost:3001/health

# If >90%, restart service
docker compose restart api
```

### Slow API Responses

```bash
# Get metrics
curl http://localhost:3001/health/metrics

# Check for slow queries in logs
docker compose logs api | grep "slow_query"
```

### Poor Web Vitals

1. Check slow resources: Open DevTools → Performance
2. Review bundle size: `pnpm build`
3. Check for layout shifts: Use Chrome DevTools → Performance Insights

## Development Workflow

### Starting Development

```bash
# Start with logging enabled
docker compose up

# Watch logs in real-time
docker compose logs -f api
docker compose logs -f client
```

### Debugging Issues

1. Check correlation ID in response headers
2. Search logs by correlation ID
3. Review error stack traces
4. Check performance metrics

### Before Deployment

1. Run tests: `pnpm test`
2. Build: `pnpm build`
3. Check bundle size
4. Review error logs
5. Verify health endpoints

## Integration Examples

### Sentry (Error Tracking)

```typescript
// Backend
import * as Sentry from '@sentry/node'
Sentry.init({ dsn: process.env.SENTRY_DSN })

// Frontend
import * as Sentry from '@sentry/react'
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })
```

### DataDog (APM)

```typescript
import tracer from 'dd-trace'
tracer.init({ service: 'treasurer-api' })
```

### Google Analytics (Web Vitals)

Web Vitals are already integrated. If `window.gtag` exists, metrics are automatically sent.

## Need Help?

- See full documentation: `/docs/MONITORING.md`
- Implementation details: `/OBSERVABILITY_IMPLEMENTATION.md`
- Health check status: `http://localhost:3001/health`
- Metrics dashboard: `http://localhost:3001/health/metrics`
