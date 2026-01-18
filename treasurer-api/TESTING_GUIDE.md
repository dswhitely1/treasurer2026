# Testing Guide: Vendor & Category Features

## Quick Start

### Run All New Tests
```bash
cd treasurer-api
pnpm test -- --run tests/services/vendorService.test.ts tests/services/categoryService.test.ts tests/routes/vendors.test.ts tests/routes/categories.test.ts tests/integration/transactionVendor.test.ts
```

### Run Individual Test Suites

#### Vendor Tests
```bash
# Service layer tests
pnpm test -- --run tests/services/vendorService.test.ts

# API integration tests
pnpm test -- --run tests/routes/vendors.test.ts
```

#### Category Tests
```bash
# Service layer tests
pnpm test -- --run tests/services/categoryService.test.ts

# API integration tests
pnpm test -- --run tests/routes/categories.test.ts
```

#### Transaction-Vendor Integration
```bash
pnpm test -- --run tests/integration/transactionVendor.test.ts
```

### Watch Mode (for development)
```bash
pnpm test -- tests/services/vendorService.test.ts
```

### With Coverage
```bash
pnpm test -- --coverage tests/services/vendorService.test.ts
```

## Test Files Overview

### Service Layer Tests (Business Logic)
- **`tests/services/vendorService.test.ts`** - 38 test cases
  - Vendor CRUD operations
  - Search and pagination
  - Delete protection
  - Organization isolation

- **`tests/services/categoryService.test.ts`** - 38 test cases
  - Category hierarchy management
  - Circular reference detection
  - Depth validation (max 3 levels)
  - Tree building and caching

### API Integration Tests (HTTP Endpoints)
- **`tests/routes/vendors.test.ts`** - 35 test cases
  - POST /api/organizations/:orgId/vendors
  - GET /api/organizations/:orgId/vendors
  - GET /api/organizations/:orgId/vendors/search
  - GET /api/organizations/:orgId/vendors/:vendorId
  - PATCH /api/organizations/:orgId/vendors/:vendorId
  - DELETE /api/organizations/:orgId/vendors/:vendorId

- **`tests/routes/categories.test.ts`** - 35 test cases
  - POST /api/organizations/:orgId/categories
  - GET /api/organizations/:orgId/categories
  - GET /api/organizations/:orgId/categories/tree
  - GET /api/organizations/:orgId/categories/:categoryId
  - PATCH /api/organizations/:orgId/categories/:categoryId
  - POST /api/organizations/:orgId/categories/:categoryId/move
  - DELETE /api/organizations/:orgId/categories/:categoryId

### Integration Tests (Cross-Feature)
- **`tests/integration/transactionVendor.test.ts`** - 18 test cases
  - Creating transactions with vendors
  - Updating vendor associations
  - Filtering by vendor
  - Vendor deletion protection
  - Memo field support
  - Combined vendor + category scenarios

## Test Patterns

### Authentication Helper
All tests use a consistent auth pattern:
```typescript
let token: string;
let orgId: string;

async function setupUserAndOrg() {
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'test@example.com',
      password: 'Password123',
      name: 'Test User',
    });

  token = registerResponse.body.data.token;

  const orgResponse = await request(app)
    .post('/api/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Organization' });

  orgId = orgResponse.body.data.id;
}

beforeEach(async () => {
  await setupUserAndOrg();
});
```

### Making Authenticated Requests
```typescript
const response = await request(app)
  .post(`/api/organizations/${orgId}/vendors`)
  .set('Authorization', `Bearer ${token}`)
  .send({ name: 'Test Vendor' });
```

### Assertions
```typescript
expect(response.status).toBe(201);
expect(response.body.success).toBe(true);
expect(response.body.data.vendor.name).toBe('Test Vendor');
```

## Common Test Scenarios

### Testing Vendor Creation
```typescript
it('should create a new vendor with valid data', async () => {
  const response = await request(app)
    .post(`/api/organizations/${orgId}/vendors`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Acme Corp',
      description: 'Office supplies vendor',
    });

  expect(response.status).toBe(201);
  expect(response.body.data.vendor.name).toBe('Acme Corp');
});
```

### Testing Category Hierarchy
```typescript
it('should create a child category', async () => {
  const parentResponse = await request(app)
    .post(`/api/organizations/${orgId}/categories`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Food' });

  const parentId = parentResponse.body.data.category.id;

  const response = await request(app)
    .post(`/api/organizations/${orgId}/categories`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Restaurants',
      parentId,
    });

  expect(response.status).toBe(201);
  expect(response.body.data.category.depth).toBe(1);
});
```

### Testing Error Cases
```typescript
it('should throw 409 error on duplicate vendor name', async () => {
  await request(app)
    .post(`/api/organizations/${orgId}/vendors`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Acme Corp' });

  const response = await request(app)
    .post(`/api/organizations/${orgId}/vendors`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Acme Corp' });

  expect(response.status).toBe(409);
  expect(response.body.error).toContain('already exists');
});
```

### Testing Authorization
```typescript
it('should not allow members to create vendors', async () => {
  const memberResponse = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'member@example.com',
      password: 'Password123',
    });
  const memberToken = memberResponse.body.data.token;

  await request(app)
    .post(`/api/organizations/${orgId}/members`)
    .set('Authorization', `Bearer ${token}`)
    .send({ email: 'member@example.com' });

  const response = await request(app)
    .post(`/api/organizations/${orgId}/vendors`)
    .set('Authorization', `Bearer ${memberToken}`)
    .send({ name: 'Test Vendor' });

  expect(response.status).toBe(403);
});
```

## Test Coverage Goals

### Service Layer
- **Vendor Service:** 80%+ line coverage
- **Category Service:** 80%+ line coverage

### Controllers
- **Vendor Controller:** 90%+ line coverage
- **Category Controller:** 90%+ line coverage

### Integration
- **Transaction-Vendor:** 75%+ line coverage

## Debugging Tests

### Run Single Test
```bash
pnpm test -- --run tests/services/vendorService.test.ts -t "should create a new vendor"
```

### Verbose Output
```bash
pnpm test -- --run tests/services/vendorService.test.ts --reporter=verbose
```

### Debug Mode
```bash
pnpm test -- --run tests/services/vendorService.test.ts --no-coverage --reporter=verbose
```

## Database Considerations

### Automatic Cleanup
All tests automatically clean the database before each test:
```typescript
beforeEach(async () => {
  await prisma.transactionStatusHistory.deleteMany()
  await prisma.transactionSplit.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.category.deleteMany()
  await prisma.vendor.deleteMany()  // Added for vendor tests
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
})
```

### Schema Note
The transaction `memo` field is required in tests. If schema changes to make it optional, update transaction creation calls.

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Vendor & Category Tests
  run: |
    cd treasurer-api
    pnpm test -- --run tests/services/vendorService.test.ts tests/services/categoryService.test.ts tests/routes/vendors.test.ts tests/routes/categories.test.ts tests/integration/transactionVendor.test.ts
```

## Test Maintenance

### When Adding New Vendor Features
1. Add service layer test first
2. Add route/controller test
3. Add integration test if cross-feature
4. Update this guide with new patterns

### When Modifying Schema
1. Update service tests first
2. Update route tests
3. Update integration tests
4. Check for memo field requirements

## Troubleshooting

### Tests Fail with Database Errors
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run `pnpm db:push` to sync schema

### Tests Fail with Memo Field Error
- Add `memo: 'Description'` to transaction creation
- This is due to required memo field in schema

### Tests Timeout
- Increase timeout: `pnpm test -- --testTimeout=10000`
- Check for database connection issues

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Summary

**Total Test Cases:** 164
- Service Tests: 76
- API Tests: 70
- Integration Tests: 18

**Test Files:** 5
- 2 Service test files
- 2 Route test files
- 1 Integration test file

**Coverage:** 80%+ target for all vendor and category features
