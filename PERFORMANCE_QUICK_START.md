# Performance Optimization Quick Start Guide

This guide provides quick reference commands and snippets for implementing the performance optimizations identified in the full audit report.

## Quick Wins (Start Here - 5-6 hours total)

### 1. Add Response Compression (30 mins)

```bash
cd treasurer-api
pnpm add compression @types/compression
```

```typescript
// In treasurer-api/src/index.ts (add BEFORE routes)
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
}));
```

**Expected Impact:** 60-70% response size reduction

### 2. Configure Database Connection Pool (15 mins)

```bash
# Update treasurer-api/.env
DATABASE_URL="postgresql://user:password@localhost:5432/treasurer_db?schema=public&connection_limit=20&pool_timeout=10"
```

```yaml
# Update docker-compose.yml
services:
  api:
    environment:
      DATABASE_URL: postgresql://treasurer:treasurer@postgres:5432/treasurer_db?schema=public&connection_limit=10&pool_timeout=10
```

**Expected Impact:** 20-30% better connection reuse

### 3. Add Edit History Pagination (1 hour)

```typescript
// In treasurer-api/src/services/transactionEditHistoryService.ts
// Replace getTransactionEditHistory function with:

export async function getTransactionEditHistory(
  organizationId: string,
  accountId: string,
  transactionId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ entries: TransactionEditHistoryInfo[]; total: number }> {
  const { limit = 20, offset = 0 } = options || {};

  // Verify account exists and belongs to org
  const account = await prisma.account.findFirst({
    where: { id: accountId, organizationId },
  });
  if (!account) {
    throw new AppError("Account not found", 404);
  }

  // Verify transaction exists and belongs to account
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId },
  });
  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  // Parallel queries for data + count
  const [history, total] = await Promise.all([
    prisma.transactionEditHistory.findMany({
      where: { transactionId },
      include: {
        editedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { editedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.transactionEditHistory.count({
      where: { transactionId },
    }),
  ]);

  return {
    entries: history.map((entry) => ({
      id: entry.id,
      transactionId: entry.transactionId,
      editedById: entry.editedById,
      editedByName: entry.editedBy.name,
      editedByEmail: entry.editedBy.email,
      editedAt: entry.editedAt.toISOString(),
      editType: entry.editType,
      changes: entry.changes as unknown as FieldChange[],
      previousState: entry.previousState as unknown as Record<string, unknown> | null,
    })),
    total,
  };
}
```

**Expected Impact:** 70-80% faster for large histories

### 4. Add HTTP Cache Headers (1 hour)

```typescript
// In treasurer-api/src/controllers/transactionController.ts

export const get: RequestHandler = async (req, res, next) => {
  try {
    const transaction = await getTransaction(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string
    );

    // Add cache headers
    res.set('Cache-Control', 'private, max-age=60');
    res.set('ETag', `"${transaction.version}"`);

    sendSuccess(res, { transaction });
  } catch (error) {
    next(error);
  }
};

export const getEditHistory: RequestHandler = async (req, res, next) => {
  try {
    const history = await getTransactionEditHistory(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string
    );

    // Cache for 5 minutes
    res.set('Cache-Control', 'private, max-age=300, must-revalidate');

    sendSuccess(res, { history });
  } catch (error) {
    next(error);
  }
};
```

**Expected Impact:** 50-60% reduction in duplicate requests

### 5. Add LRU Cache for Org Membership (2 hours)

```typescript
// Create: treasurer-api/src/middleware/orgMembershipCache.ts

import { LRUCache } from 'lru-cache';
import type { RequestHandler } from 'express';
import { prisma } from '../config/database.js';

// Cache org membership checks for 5 minutes
const membershipCache = new LRUCache<string, { isMember: boolean; role?: string }>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: false,
});

export const requireOrgMembershipCached = (allowedRoles?: string[]): RequestHandler => {
  return async (req, res, next) => {
    const userId = req.user?.id;
    const orgId = req.params.orgId;

    if (!userId || !orgId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const cacheKey = `${userId}:${orgId}`;

    // Check cache first
    const cached = membershipCache.get(cacheKey);
    if (cached !== undefined) {
      if (cached.isMember && (!allowedRoles || (cached.role && allowedRoles.includes(cached.role)))) {
        return next();
      } else {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
    }

    // Cache miss - query database
    const member = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!member) {
      membershipCache.set(cacheKey, { isMember: false });
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const hasAccess = !allowedRoles || allowedRoles.includes(member.role);
    membershipCache.set(cacheKey, { isMember: true, role: member.role });

    if (hasAccess) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
  };
};

// Export function to invalidate cache when membership changes
export function invalidateOrgMembershipCache(userId: string, orgId: string) {
  membershipCache.delete(`${userId}:${orgId}`);
}
```

```typescript
// Update: treasurer-api/src/middleware/auth.ts
// Replace requireOrgMembership with requireOrgMembershipCached in routes
```

**Expected Impact:** 80-90% faster authorization checks

---

## Database Optimizations

### Add JSONB GIN Indexes

```sql
-- Run in PostgreSQL
CREATE INDEX idx_transaction_edit_history_changes_gin
ON transaction_edit_history USING GIN (changes jsonb_path_ops);

CREATE INDEX idx_transaction_edit_history_previous_state_gin
ON transaction_edit_history USING GIN (previous_state jsonb_path_ops);
```

```bash
# Or via Prisma migration
cd treasurer-api
pnpm prisma migrate dev --name add_jsonb_indexes
```

### Add Covering Index for Edit History

```sql
CREATE INDEX idx_edit_history_covering
ON transaction_edit_history (transaction_id, edited_at DESC)
INCLUDE (edited_by_id, edit_type);
```

---

## Monitoring Setup (Critical!)

### Add Request Timing Middleware

```typescript
// Create: treasurer-api/src/middleware/timing.ts

import type { RequestHandler } from 'express';

export const requestTiming: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000;

    // Log slow requests (> 500ms)
    if (duration > 500) {
      console.warn(`[SLOW] ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    }

    // Add to response headers for debugging
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });

  next();
};
```

```typescript
// In treasurer-api/src/index.ts
import { requestTiming } from './middleware/timing.js';

app.use(requestTiming);
```

---

## Frontend Optimizations

### Add Redux Selector Memoization

```typescript
// In treasurer/src/store/features/transactionSlice.ts

import { createSelector } from '@reduxjs/toolkit';

// Add memoized selectors
export const selectEditFormIsValid = createSelector(
  [
    selectEditFormData,
    selectEditValidationErrors,
  ],
  (formData, errors) => {
    if (!formData) return false;
    return Object.keys(errors).length === 0 &&
           formData.description.trim().length > 0 &&
           parseFloat(formData.amount) > 0 &&
           formData.splits.length > 0;
  }
);

export const selectEditFormRemainingAmount = createSelector(
  [selectEditFormData],
  (formData) => {
    if (!formData) return 0;
    const totalAmount = parseFloat(formData.amount) || 0;
    const splitTotal = formData.splits.reduce(
      (sum, split) => sum + (parseFloat(split.amount) || 0),
      0
    );
    return totalAmount - splitTotal;
  }
);
```

### Enable Web Vitals Tracking

```typescript
// Create: treasurer/src/lib/analytics/webVitals.ts

import { onCLS, onFID, onLCP, onINP, onTTFB, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric.rating);

  // Optional: Send to backend
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {
    // Ignore analytics failures
  });
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

```typescript
// In treasurer/src/main.tsx
import { initWebVitals } from './lib/analytics/webVitals';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

initWebVitals();
```

---

## Load Testing Setup

### Install k6

```bash
# macOS
brew install k6

# Linux
curl https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz -L | tar xvz
sudo cp k6-v0.48.0-linux-amd64/k6 /usr/local/bin

# Windows
choco install k6
```

### Create Basic Load Test

```javascript
// Create: tests/load/transaction-edit.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3001/api';
const ORG_ID = __ENV.ORG_ID || 'your-org-id';
const ACCOUNT_ID = __ENV.ACCOUNT_ID || 'your-account-id';
const TOKEN = __ENV.AUTH_TOKEN || 'your-token';

export default function () {
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Fetch transaction
  const res = http.get(
    `${BASE_URL}/organizations/${ORG_ID}/accounts/${ACCOUNT_ID}/transactions`,
    { headers }
  );

  check(res, {
    'status 200': (r) => r.status === 200,
    'duration < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Run Load Test

```bash
ORG_ID=org-123 ACCOUNT_ID=acc-123 AUTH_TOKEN=your-token k6 run tests/load/transaction-edit.js
```

---

## Performance Testing Checklist

### Before Starting
- [ ] Document current baseline metrics
- [ ] Set up monitoring (timing middleware)
- [ ] Create test data (multiple transactions, edit histories)

### After Each Optimization
- [ ] Run load tests
- [ ] Measure response times
- [ ] Check browser DevTools Performance tab
- [ ] Verify bundle size
- [ ] Test on slow network (Chrome DevTools → Network → Slow 3G)

### Key Metrics to Track

**Backend:**
- Transaction GET: Target <100ms
- Transaction PATCH: Target <200ms
- Edit history GET: Target <150ms
- Response size (before/after gzip)

**Frontend:**
- Time to Interactive (TTI): Target <200ms
- First Input Delay (FID): Target <100ms
- Largest Contentful Paint (LCP): Target <2.5s
- Cumulative Layout Shift (CLS): Target <0.1

**Database:**
- Query execution time: Target <50ms
- Index hit rate: Target >99%
- Connection pool usage: Target <70%

---

## Common Issues & Solutions

### Issue: "Too many database connections"
**Solution:** Check connection pool configuration in DATABASE_URL

### Issue: "Slow edit history loading"
**Solution:** Verify pagination is implemented and JSONB indexes exist

### Issue: "High memory usage in browser"
**Solution:** Check for memory leaks, implement virtual scrolling for large lists

### Issue: "Version conflicts too frequent"
**Solution:** Review concurrent user patterns, consider optimistic UI updates

### Issue: "Slow API responses"
**Solution:** Check response compression is enabled, verify no N+1 queries

---

## Next Steps

1. **Today:** Implement Quick Wins (5-6 hours)
2. **This Week:** Add monitoring, run baseline load tests
3. **Next Week:** Implement medium-effort optimizations (Phase 2)
4. **This Month:** Complete advanced optimizations (Phase 3)

Refer to the full [PERFORMANCE_AUDIT_REPORT.md](./PERFORMANCE_AUDIT_REPORT.md) for detailed analysis and additional optimizations.

---

## Performance Budget

| Metric | Current | Target | Critical |
|--------|---------|--------|----------|
| API Response (p95) | TBD | <300ms | >800ms |
| Edit History Load | TBD | <150ms | >600ms |
| Modal Open Time | TBD | <200ms | >500ms |
| Bundle Size (edit) | ~38KB | <40KB | >80KB |

Track these metrics after each optimization phase!
