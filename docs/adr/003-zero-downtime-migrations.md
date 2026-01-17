# ADR-003: Zero-Downtime Database Migrations

**Status:** Accepted
**Date:** 2026-01-17
**Deciders:** Development Team
**Technical Story:** Production deployment strategy

## Context

As Treasurer grows and evolves, we need to make database schema changes without causing downtime for users. Traditional migration approaches often require:

1. Taking application offline
2. Running migration
3. Deploying new application code
4. Bringing application back online

For a financial application, downtime is unacceptable. We needed a strategy that:

- Allows schema changes while application is running
- Prevents data loss or corruption
- Supports rollback if issues arise
- Works with Prisma's migration system
- Can be automated in CI/CD pipelines

## Decision

We adopted a **multi-phase migration strategy** for breaking changes:

### Phase-Based Migration Pattern

**For Non-Breaking Changes** (simple additions):
- Single deployment with migration + code

**For Breaking Changes** (renames, removals):
- Multiple deployments over time
- Each phase is independently deployable
- Allows safe rollback at each step

### Example: Renaming a Column

**Phase 1: Add New Column**
```prisma
model Transaction {
  description  String    // Old column
  memo         String?   // New column (nullable)
}
```
```bash
# Create migration
npx prisma migrate dev --name add-memo-column
# Deploy
pnpm db:migrate deploy
```

**Phase 2: Deploy Dual-Write Code**
```typescript
// Write to both columns
await prisma.transaction.create({
  data: {
    description: value,  // Old
    memo: value,         // New
  },
})
```

**Phase 3: Backfill Data**
```typescript
// One-time script
await prisma.$executeRaw`
  UPDATE transactions
  SET memo = description
  WHERE memo IS NULL
`
```

**Phase 4: Deploy Read-From-New Code**
```typescript
// Read from new column
const description = transaction.memo
```

**Phase 5: Make Column Non-Nullable**
```prisma
model Transaction {
  description  String    // Old column
  memo         String    // New column (required)
}
```
```bash
npx prisma migrate dev --name memo-required
pnpm db:migrate deploy
```

**Phase 6: Remove Old Column**
```prisma
model Transaction {
  memo  String  // Only new column remains
}
```
```bash
npx prisma migrate dev --name remove-description
pnpm db:migrate deploy
```

### Migration Checklist

Before each production migration:

- [ ] Tested in staging environment
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Off-peak hours scheduled (if possible)
- [ ] Monitoring alerts configured
- [ ] Team notified

## Consequences

### Positive

**1. Zero Downtime**
- Application remains available during migrations
- Users experience no service interruption
- Critical for production financial systems

**2. Safe Rollback**
- Each phase can be rolled back independently
- Old code works with new schema (dual writes)
- New code works with old schema (nullable columns)

**3. Gradual Migration**
- Data can be backfilled incrementally
- Reduces database lock time
- Spreads migration cost over time

**4. Risk Mitigation**
- Issues can be caught early (before removing old column)
- Easy to revert if problems arise
- Maintains data integrity throughout

**5. Production Confidence**
- Team can deploy with confidence
- Lower stress deployments
- Easier to automate

### Negative

**1. Slower Migration Process**
- Multiple deployments required
- Weeks instead of minutes for full migration
- More coordination needed

**Mitigation:**
- Only needed for breaking changes
- Can be automated in many cases
- Better than downtime

**2. Temporary Schema Complexity**
- Dual columns during migration
- More database storage used
- Schema less clean during transition

**Mitigation:**
- Well-documented phases
- Clear timeline for cleanup
- Temporary state is acceptable

**3. Code Complexity**
- Dual write/read logic needed
- More code to test
- Need to track migration state

**Mitigation:**
- Temporary code, removed after migration
- Feature flags can help
- Comprehensive testing

**4. Coordination Required**
- Need to track migration phases
- Team must understand process
- Documentation critical

**Mitigation:**
- Clear runbooks
- Automated checks for migration state
- Team training

### Technical Impact

**Database:**
- Migrations run with `pnpm db:migrate deploy` (non-interactive)
- No manual SQL needed for most cases
- Indexes added with `CONCURRENTLY` when possible (PostgreSQL)

**Deployment:**
- CI/CD runs migrations before deploying code
- Health checks verify migration success
- Automatic rollback on failure

**Monitoring:**
- Migration duration tracked
- Database lock time monitored
- Error rates watched after deployment

## Alternatives Considered

### Alternative 1: Downtime Maintenance Windows

**Description:** Schedule downtime, run migration, deploy code, bring back online.

**Rejected because:**
- Unacceptable for financial application
- Poor user experience
- Difficult to schedule globally
- Risk of extended downtime if issues arise

### Alternative 2: Read Replicas During Migration

**Description:** Use read replicas to serve traffic while migrating primary.

**Rejected because:**
- Only solves read traffic, not writes
- Complexity of replica promotion
- Still has downtime for failover
- More infrastructure required

### Alternative 3: Blue-Green Deployment

**Description:** Maintain two complete environments, migrate one, switch traffic.

**Rejected because:**
- Database can't easily be blue-green
- Shared database would still have schema issues
- High infrastructure cost
- Complex to manage

### Alternative 4: Schema Versioning

**Description:** Support multiple schema versions simultaneously.

**Rejected because:**
- Extreme complexity
- Hard to maintain
- Prisma doesn't support this well
- Overkill for our needs

## Implementation Guidelines

### Non-Breaking Changes

Can be deployed in single phase:

**Examples:**
- Adding nullable column
- Adding new table
- Adding index
- Adding constraint (if data already valid)

**Process:**
1. Create migration
2. Test in staging
3. Deploy to production

### Breaking Changes

Require multi-phase deployment:

**Examples:**
- Renaming column
- Changing column type
- Making column non-nullable
- Removing column
- Removing table

**Process:**
1. Follow phase-based pattern above
2. Document each phase
3. Schedule deployments
4. Verify at each step

### Prisma Considerations

**Using Prisma Migrate in Production:**

```bash
# Don't use migrate dev in production
# ❌ pnpm db:migrate dev

# Use migrate deploy (non-interactive, safe for CI/CD)
# ✅ pnpm db:migrate deploy
```

**Checking Migration Status:**

```bash
# See pending migrations
npx prisma migrate status

# See migration history
npx prisma migrate status --verbose
```

## Related Decisions

- [ADR-005: Single Transaction for Bulk Updates](./005-single-transaction-bulk-updates.md) - Database transaction patterns

## References

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Deployment Guide](../DEPLOYMENT.md#database-migrations)
- Migration directory: `/home/don/dev/treasurer2026/treasurer-api/prisma/migrations/`

---

**Last Updated:** 2026-01-17
