# Monitoring and Observability Guide

This document provides comprehensive guidance on monitoring, observability, and performance optimization for the Treasurer application.

## Table of Contents

- [Overview](#overview)
- [Backend Observability](#backend-observability)
- [Frontend Observability](#frontend-observability)
- [Key Metrics](#key-metrics)
- [Alert Thresholds](#alert-thresholds)
- [Dashboard Recommendations](#dashboard-recommendations)
- [Log Aggregation Setup](#log-aggregation-setup)
- [Performance Baselines](#performance-baselines)
- [Troubleshooting](#troubleshooting)

## Overview

The Treasurer application includes comprehensive observability features:

- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Performance Monitoring**: API response times and slow query detection
- **Health Checks**: Kubernetes-ready health endpoints
- **Web Vitals Tracking**: Core Web Vitals monitoring for user experience
- **Error Tracking**: Global error handlers and React Error Boundaries
- **Query Caching**: In-memory caching for expensive database queries

## Backend Observability

### Structured Logging (Pino)

All backend logs are structured JSON with the following format:

```json
{
  "timestamp": "2024-01-17T12:00:00.000Z",
  "level": "info",
  "message": "Request completed",
  "request": {
    "id": "uuid-v4",
    "method": "GET",
    "url": "/api/organizations/123/accounts"
  },
  "duration": 45,
  "statusCode": 200
}
```

**Log Levels:**
- `debug`: Development-only detailed information
- `info`: General informational messages
- `warn`: Warning messages (slow queries, high memory usage)
- `error`: Error conditions requiring attention

**Key Features:**
- Correlation IDs for request tracking across services
- User context attached after authentication
- Database query performance logging
- Automatic slow query detection (>100ms)

### Performance Monitoring

**Middleware Features:**
- Request response time tracking
- Memory usage monitoring
- Slow request alerts (>1s warning, >3s error)
- Metrics collection for dashboards

**Metrics Endpoint:**
- `GET /health/metrics` - Returns performance metrics

```json
{
  "requests": {
    "total": 1000,
    "by_status": { "200": 950, "404": 30, "500": 20 },
    "by_method": { "GET": 800, "POST": 150, "PATCH": 40, "DELETE": 10 }
  },
  "performance": {
    "avg_response_time": "45.23",
    "p50": 35,
    "p95": 120,
    "p99": 450,
    "min": 5,
    "max": 2100,
    "slow_requests": 15,
    "very_slow_requests": 2
  },
  "errors": {
    "total": 50,
    "by_code": { "400": 20, "404": 20, "500": 10 }
  },
  "system": {
    "memory": {
      "heapUsed": "45.23 MB",
      "heapTotal": "100.00 MB",
      "external": "2.50 MB",
      "rss": "120.00 MB"
    },
    "uptime": "86400.00 s"
  }
}
```

### Health Check Endpoints

**Basic Health Check:**
- `GET /health` - Database connectivity, memory usage, uptime

**Kubernetes Probes:**
- `GET /health/ready` - Readiness probe (fails if memory >90%)
- `GET /health/live` - Liveness probe (always returns 200)

### Database Query Optimization

**Prisma Middleware:**
- Automatically logs slow queries (>100ms)
- Tracks query execution time
- Warns on performance issues

**Query Cache:**
- In-memory caching for expensive reads
- Configurable TTL (default 60s)
- Pattern-based cache invalidation

**Example Usage:**
```typescript
import { cacheQuery, invalidateCachePattern } from '@/config/prisma-logging'

// Cache a query
const accounts = await cacheQuery(
  `org:${orgId}:accounts`,
  () => prisma.account.findMany({ where: { organizationId: orgId } }),
  60000 // 1 minute TTL
)

// Invalidate related cache entries
invalidateCachePattern(`org:${orgId}`)
```

## Frontend Observability

### Error Boundaries

React Error Boundary catches component errors and provides graceful fallback UI.

**Features:**
- Catches errors in component tree
- Logs errors with full stack traces
- Shows user-friendly error message
- Development mode shows full error details
- Integration-ready for Sentry

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Web Vitals Tracking

Core Web Vitals are automatically tracked:

- **CLS** (Cumulative Layout Shift): Visual stability
- **FID** (First Input Delay): Legacy interactivity metric
- **INP** (Interaction to Next Paint): Responsiveness
- **LCP** (Largest Contentful Paint): Loading performance
- **FCP** (First Contentful Paint): First render
- **TTFB** (Time to First Byte): Server response

**Thresholds (Google recommendations):**
- CLS: Good <0.1, Needs Improvement <0.25, Poor ≥0.25
- INP: Good <200ms, Needs Improvement <500ms, Poor ≥500ms
- LCP: Good <2.5s, Needs Improvement <4s, Poor ≥4s
- FCP: Good <1.8s, Needs Improvement <3s, Poor ≥3s
- TTFB: Good <800ms, Needs Improvement <1.8s, Poor ≥1.8s

**Integration:**
Web Vitals are logged and can be sent to analytics services:
```typescript
window.addEventListener('web-vital', (event) => {
  const { name, value, rating } = event.detail
  // Send to analytics
})
```

### Structured Logging

Frontend logger provides consistent logging:

```typescript
import { logger } from '@/utils/logger'

// Log levels
logger.debug('Debug message', { context: 'value' })
logger.info('Info message', { context: 'value' })
logger.warn('Warning message', { context: 'value' })
logger.error('Error message', { context: 'value' })

// API errors
logger.apiError('Failed to fetch data', error, { endpoint: '/api/...' })

// User actions
logger.userAction('button_click', { button: 'submit' })
```

**Error Storage:**
- Errors stored in localStorage (last 50)
- Accessible via `logger.getStoredErrors()`
- Can be sent to backend on demand

### Performance Monitoring

**Performance Markers:**
```typescript
import { PerformanceMarker } from '@/utils/performance'

const marker = new PerformanceMarker('expensive-operation')
// ... do work ...
const duration = marker.end()
```

**Navigation Timing:**
- Automatically logs page load metrics
- Tracks DNS, TCP, TLS, TTFB, download times
- Available via `getNavigationTiming()`

**Slow Resources:**
- Automatically detects resources >1s load time
- Logs via `logSlowResources()`

### Code Splitting

All routes are lazy-loaded for optimal bundle size:
- Separate chunks per page
- Suspense with loading fallback
- Reduced initial bundle size

### React.memo Optimization

Expensive components are memoized:
- `AccountCard` - Prevents re-renders on list updates
- `TransactionCard` - Prevents re-renders on list updates

## Key Metrics

### Backend Metrics to Monitor

| Metric | Description | Collection Method |
|--------|-------------|-------------------|
| API Response Time | P50, P95, P99 response times | `/health/metrics` endpoint |
| Error Rate | 4xx and 5xx errors per minute | `/health/metrics` endpoint |
| Database Query Time | Slow queries >100ms | Pino logs (filter: `type: "slow_query"`) |
| Memory Usage | Heap used vs total | `/health` endpoint |
| Request Rate | Requests per second | `/health/metrics` endpoint |
| Active Connections | Database connections | Monitor via Prisma |

### Frontend Metrics to Monitor

| Metric | Description | Target |
|--------|-------------|--------|
| LCP | Largest Contentful Paint | <2.5s |
| INP | Interaction to Next Paint | <200ms |
| CLS | Cumulative Layout Shift | <0.1 |
| FCP | First Contentful Paint | <1.8s |
| TTFB | Time to First Byte | <800ms |
| Bundle Size | Main JS bundle size | <200KB gzipped |
| Error Rate | JavaScript errors per session | <0.1% |

## Alert Thresholds

### Critical Alerts (Immediate Action)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| API Error Rate | >5% | Investigate immediately |
| Memory Usage | >90% | Scale or restart |
| Database Connection Failed | Any | Check database health |
| Response Time P99 | >5s | Check slow queries |

### Warning Alerts (Monitor)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| API Error Rate | >1% | Monitor trends |
| Memory Usage | >75% | Plan scaling |
| Response Time P95 | >1s | Optimize endpoints |
| Slow Queries | >10/min | Review indexes |
| LCP | >4s | Optimize frontend |

## Dashboard Recommendations

### Backend Dashboard (Grafana/DataDog)

**Panels:**
1. Request Rate (requests/sec) - Time series
2. Error Rate (%) - Time series with 1% and 5% thresholds
3. Response Time Percentiles (P50, P95, P99) - Time series
4. Memory Usage (%) - Gauge with 75% and 90% thresholds
5. Top Slow Queries - Table
6. HTTP Status Codes - Pie chart
7. Database Connection Pool - Gauge

**Metrics Source:**
- Scrape `/health/metrics` every 15s
- Parse Pino JSON logs for detailed insights

### Frontend Dashboard

**Panels:**
1. Core Web Vitals (LCP, INP, CLS) - Histogram
2. Page Load Time - Time series
3. JavaScript Error Rate - Time series
4. Bundle Size Trends - Line chart
5. Browser Distribution - Pie chart
6. User Sessions - Time series

**Metrics Source:**
- Send Web Vitals to analytics on page unload
- Aggregate error logs from localStorage

## Log Aggregation Setup

### Recommended Stack

**Option 1: ELK Stack**
- Elasticsearch: Log storage and search
- Logstash/Fluentd: Log shipping
- Kibana: Visualization

**Option 2: Cloud Services**
- DataDog: Comprehensive monitoring
- New Relic: APM + logging
- Grafana Loki: Lightweight log aggregation

### Log Collection

**Backend:**
```bash
# Ship logs to stdout in JSON format (production)
NODE_ENV=production npm start | tee >(send-to-log-aggregator)
```

**Frontend:**
- Send stored errors to backend endpoint
- Use Sentry for real-time error tracking

### Example Log Queries

**Find slow API requests:**
```
level:"warn" AND type:"slow_request"
```

**Find errors by user:**
```
level:"error" AND user.id:"<user-id>"
```

**Find database errors:**
```
level:"error" AND error.message:"Database"
```

## Performance Baselines

### Backend Performance Targets

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| GET /health | <10ms | <20ms | <50ms |
| GET /api/auth/me | <50ms | <100ms | <200ms |
| GET /api/organizations | <100ms | <200ms | <500ms |
| GET /api/organizations/:id/accounts | <150ms | <300ms | <750ms |
| POST /api/organizations/:id/accounts | <200ms | <400ms | <1000ms |
| GET /api/.../transactions | <200ms | <500ms | <1500ms |

### Frontend Performance Targets

| Page | LCP | INP | CLS | Bundle Size |
|------|-----|-----|-----|-------------|
| Home | <1.5s | <100ms | <0.05 | <50KB |
| Login | <1.2s | <100ms | <0.05 | <80KB |
| Dashboard | <2s | <150ms | <0.1 | <150KB |
| Transactions | <2.5s | <200ms | <0.1 | <200KB |

### Database Query Targets

| Query Type | Target | Action if Exceeded |
|------------|--------|-------------------|
| Simple SELECT | <10ms | Check indexes |
| JOIN queries | <50ms | Review query plan |
| Aggregate queries | <100ms | Consider caching |
| Full-text search | <200ms | Optimize indexes |

## Troubleshooting

### High API Response Times

1. Check `/health/metrics` for slow endpoints
2. Review slow query logs: `level:"warn" AND type:"slow_query"`
3. Run `EXPLAIN ANALYZE` on slow queries
4. Check database connection pool
5. Review cache hit rates

### High Memory Usage

1. Check `/health` for current memory usage
2. Review for memory leaks in query cache
3. Check for large response payloads
4. Monitor database connection leaks
5. Restart service if >90%

### Poor Web Vitals

**High LCP:**
- Optimize images (compress, lazy load)
- Enable compression on server
- Use CDN for static assets
- Reduce bundle size

**High INP:**
- Reduce JavaScript execution time
- Use React.memo for expensive components
- Debounce input handlers
- Split large tasks

**High CLS:**
- Set dimensions on images
- Avoid inserting content above fold
- Use CSS containment
- Reserve space for dynamic content

### Database Performance Issues

1. Check for missing indexes:
   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public';
   ```

2. Review slow queries:
   ```sql
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

3. Check connection pool:
   ```sql
   SELECT count(*) as connections
   FROM pg_stat_activity
   WHERE datname = current_database();
   ```

## Integration with External Services

### Sentry (Error Tracking)

**Backend:**
```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

**Frontend:**
```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
})
```

### DataDog (APM)

**Backend:**
```typescript
import tracer from 'dd-trace'

tracer.init({
  service: 'treasurer-api',
  env: process.env.NODE_ENV,
})
```

### Google Analytics (Web Vitals)

```typescript
// Already integrated via gtag in performance.ts
window.gtag('event', metric.name, {
  value: Math.round(metric.value),
  metric_rating: rating,
})
```

## Best Practices

1. **Always include correlation IDs** in logs for request tracing
2. **Set up alerts** for critical metrics before going to production
3. **Review metrics weekly** to identify trends
4. **Optimize based on data**, not assumptions
5. **Keep performance budgets** and enforce in CI/CD
6. **Test monitoring** in staging before production
7. **Document baselines** and update as system evolves
8. **Set up dashboards** for on-call engineers

## Next Steps

1. Set up log aggregation (ELK or DataDog)
2. Configure alerting rules
3. Create monitoring dashboards
4. Integrate Sentry for error tracking
5. Set up synthetic monitoring for uptime
6. Configure performance budgets in CI/CD
7. Document runbooks for common issues
