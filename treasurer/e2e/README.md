# E2E Tests for Transaction Edit Functionality

This directory contains comprehensive end-to-end tests for the transaction edit feature using Playwright.

## Test Organization

The E2E tests are organized by feature area:

### 1. `transaction-edit-basic.e2e.ts`
Tests the fundamental edit workflow:
- Opening edit modal with pre-filled form
- Modifying transaction fields (memo, amount, date)
- Saving changes successfully
- Closing modal without saving
- Success notifications
- Version tracking
- Body scroll prevention

### 2. `transaction-edit-splits.e2e.ts`
Tests transaction split editing:
- Displaying existing splits
- Adding new splits
- Removing splits
- Modifying split categories and amounts
- Validating split totals match transaction amount
- Converting between single and multiple splits
- Split order preservation

### 3. `transaction-edit-conflicts.e2e.ts`
Tests optimistic locking and conflict resolution:
- Detecting conflicts when editing stale data
- Conflict resolution dialog with side-by-side comparison
- "Keep my changes" option (force save)
- "Use server version" option (reload)
- Cancel option
- Version mismatch details
- Escape key prevention during conflict

### 4. `transaction-edit-history.e2e.ts`
Tests edit history functionality:
- Displaying edit history timeline
- Showing timestamps and user information
- Expanding change details
- Before/after value comparison
- Tracking multiple edits chronologically
- Creation vs. update actions
- Split change tracking

### 5. `transaction-edit-validation.e2e.ts`
Tests validation and authorization:
- Required field validation (memo, amount, date)
- Amount validation (> 0, no negatives, decimal format)
- Date validation (format, future dates)
- Multiple simultaneous errors
- Error clearing on fix
- Reconciled transaction restrictions
- Stale data warnings
- Permission-based restrictions

### 6. `transaction-edit-ux.e2e.ts`
Tests user experience features:
- Keyboard navigation (Escape, Cmd/Ctrl+S, Tab)
- Focus management and trapping
- ARIA attributes and accessibility
- Screen reader announcements
- Touch target sizes
- Responsive design (mobile, tablet, desktop)
- Network error handling
- API error responses
- Timeout handling
- URL state management
- Browser back button
- Query parameter preservation

## Running the Tests

### Prerequisites

1. Ensure the backend API is running:
   ```bash
   cd treasurer-api && pnpm dev
   ```

2. Ensure the frontend is running or configure `webServer` in `playwright.config.ts`:
   ```bash
   cd treasurer && pnpm dev
   ```

### Run All E2E Tests

```bash
# From the treasurer directory
pnpm test:e2e
```

### Run Specific Test Suite

```bash
# Run only basic edit tests
pnpm test:e2e transaction-edit-basic

# Run only conflict resolution tests
pnpm test:e2e transaction-edit-conflicts
```

### Run Tests in UI Mode

```bash
pnpm test:e2e:ui
```

### Run Tests in Headed Mode

```bash
pnpm test:e2e:headed
```

### Run Tests for Specific Browser

```bash
# Chromium only
pnpm test:e2e --project=chromium

# Firefox only
pnpm test:e2e --project=firefox

# WebKit only
pnpm test:e2e --project=webkit

# Mobile Chrome
pnpm test:e2e --project="Mobile Chrome"
```

### Debug Tests

```bash
# Run with debugger
pnpm test:e2e --debug

# Run with trace viewer
pnpm test:e2e --trace on
```

## Test Data

Test data is managed through fixtures:

- **`fixtures/auth.fixture.ts`**: Authentication helpers and test user data
- **`fixtures/transaction.fixture.ts`**: Sample transactions and categories

## Page Objects

The tests use the Page Object Model pattern:

- **`helpers/transaction-edit.helper.ts`**:
  - `TransactionEditPage`: Methods for interacting with the edit modal
  - `ConflictResolutionDialog`: Methods for conflict resolution dialog
  - Helper functions for common operations

## Environment Variables

Set these in `.env.local` or CI environment:

```bash
# Base URL for tests (defaults to http://localhost:3000)
VITE_E2E_BASE_URL=http://localhost:3000

# API URL for backend
VITE_API_URL=http://localhost:3001/api
```

## CI/CD Integration

The tests are configured to run in CI with:
- Headless mode
- Video recording on failure
- Screenshot on failure
- Retry on failure (2 retries)
- Serial execution to avoid race conditions

### GitHub Actions Example

```yaml
- name: Install Playwright Browsers
  run: pnpm exec playwright install --with-deps

- name: Run E2E Tests
  run: pnpm test:e2e
  env:
    CI: true

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Test Coverage

The E2E tests provide comprehensive coverage of:

- ✅ Basic edit flow (10 tests)
- ✅ Split editing (9 tests)
- ✅ Optimistic locking & conflicts (6 tests)
- ✅ Edit history (10 tests)
- ✅ Validation (10 tests)
- ✅ Authorization (3 tests)
- ✅ Keyboard navigation (7 tests)
- ✅ Accessibility (3 tests)
- ✅ Responsive design (3 tests)
- ✅ Error handling (3 tests)
- ✅ URL state management (6 tests)

**Total: 70+ E2E tests**

## Best Practices

1. **Isolation**: Each test is independent and can run in any order
2. **Wait Strategies**: Use explicit waits, avoid hard-coded timeouts
3. **Selectors**: Prefer data-testid, role, and label selectors over CSS
4. **Clean Up**: Tests clean up after themselves
5. **Assertions**: Use meaningful assertion messages
6. **Page Objects**: Centralize locators and interactions
7. **Fixtures**: Reuse common setup logic

## Debugging Tips

1. **Run in headed mode** to see what's happening:
   ```bash
   pnpm test:e2e:headed
   ```

2. **Use UI mode** for interactive debugging:
   ```bash
   pnpm test:e2e:ui
   ```

3. **Add `page.pause()`** to stop execution at a specific point:
   ```typescript
   await page.pause()
   ```

4. **View trace files** after failures:
   ```bash
   pnpm exec playwright show-trace playwright-report/trace.zip
   ```

5. **Slow down execution** for visual debugging:
   ```typescript
   test.use({ launchOptions: { slowMo: 1000 } })
   ```

## Common Issues

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Check if backend is running
- Verify network connectivity

### Flaky tests
- Add proper wait conditions
- Use `waitForLoadState('networkidle')`
- Avoid `waitForTimeout()` where possible

### Element not found
- Verify data-testid attributes exist in components
- Check if element is in viewport
- Ensure element is not hidden by CSS

## Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Use Page Object Model pattern
3. Add meaningful test descriptions
4. Include assertions with clear messages
5. Update this README with new test categories
6. Ensure tests pass locally before committing
