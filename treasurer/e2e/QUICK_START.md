# E2E Tests - Quick Start Guide

## Prerequisites

Before running E2E tests, ensure you have:

1. **Backend API running**:
   ```bash
   cd treasurer-api
   pnpm dev
   ```
   API should be accessible at `http://localhost:3001`

2. **Frontend running** (optional - Playwright can start it for you):
   ```bash
   cd treasurer
   pnpm dev
   ```
   Frontend should be accessible at `http://localhost:3000`

3. **Test data**: Database should be seeded with test data

## Installation

```bash
cd treasurer

# Install dependencies (includes Playwright)
pnpm install

# Install Playwright browsers (only needed once)
pnpm exec playwright install --with-deps
```

## Running Tests

### Most Common Commands

```bash
# Run all E2E tests (headless, fast)
pnpm test:e2e

# Run tests with visual feedback (recommended for development)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Debug a specific test
pnpm test:e2e:debug transaction-edit-basic
```

### Run Specific Test Files

```bash
# Basic edit flow tests
pnpm test:e2e transaction-edit-basic

# Split editing tests
pnpm test:e2e transaction-edit-splits

# Conflict resolution tests
pnpm test:e2e transaction-edit-conflicts

# Edit history tests
pnpm test:e2e transaction-edit-history

# Validation tests
pnpm test:e2e transaction-edit-validation

# UX and accessibility tests
pnpm test:e2e transaction-edit-ux
```

### Run Specific Browsers

```bash
# Chrome only (fastest)
pnpm test:e2e:chromium

# Firefox only
pnpm test:e2e:firefox

# Safari only
pnpm test:e2e:webkit

# Mobile Chrome
pnpm test:e2e:mobile
```

## Viewing Results

### Test Report
After running tests, view the HTML report:
```bash
pnpm test:e2e:report
```

### Artifacts
Test artifacts are saved in:
- `test-results/` - Screenshots, videos, traces of failed tests
- `playwright-report/` - HTML test report

## Debugging Failed Tests

### Option 1: UI Mode (Recommended)
```bash
pnpm test:e2e:ui
```
- Click on a test to see detailed timeline
- Step through test execution
- Inspect DOM at each step
- View network requests
- See screenshots and videos

### Option 2: Debug Mode
```bash
pnpm test:e2e:debug
```
- Opens Playwright Inspector
- Pause and step through tests
- Evaluate selectors in real-time
- Record new test steps

### Option 3: Headed Mode
```bash
pnpm test:e2e:headed
```
- Watch tests run in a visible browser
- Good for understanding test flow
- Slower than headless mode

### Option 4: Trace Viewer
If a test failed and you have a trace file:
```bash
pnpm exec playwright show-trace test-results/path-to-trace.zip
```

## Writing New Tests

### 1. Choose the Right File
- Basic edit operations → `transaction-edit-basic.e2e.ts`
- Split management → `transaction-edit-splits.e2e.ts`
- Conflicts → `transaction-edit-conflicts.e2e.ts`
- History → `transaction-edit-history.e2e.ts`
- Validation → `transaction-edit-validation.e2e.ts`
- UX/Accessibility → `transaction-edit-ux.e2e.ts`

### 2. Use Page Objects
```typescript
import { test, expect } from './fixtures/auth.fixture'
import { TransactionEditPage } from './helpers/transaction-edit.helper'
import { SAMPLE_TRANSACTIONS } from './fixtures/transaction.fixture'

test('should do something', async ({ page, testContext }) => {
  const editPage = new TransactionEditPage(page)
  const transaction = SAMPLE_TRANSACTIONS[0]

  await editPage.openEditModal(transaction.id)
  await editPage.fillTransactionForm({ memo: 'New memo' })
  await editPage.save()
  await editPage.waitForSaveSuccess()
})
```

### 3. Follow Best Practices
- Use `data-testid` attributes for selectors
- Wait for elements explicitly, don't use `waitForTimeout()`
- Use meaningful test descriptions
- Test one thing per test
- Keep tests independent

## Common Issues

### Tests Timing Out
- **Cause**: Backend not running or slow to respond
- **Fix**: Start backend first, check it's healthy at `/health`

### Element Not Found
- **Cause**: Selector doesn't match, element not rendered
- **Fix**:
  1. Run in headed mode to see what's on screen
  2. Verify `data-testid` exists in component
  3. Add explicit wait: `await expect(element).toBeVisible()`

### Flaky Tests
- **Cause**: Race conditions, timing issues
- **Fix**:
  1. Add proper wait conditions
  2. Use `waitForLoadState('networkidle')`
  3. Avoid fixed delays

### Port Already in Use
- **Cause**: Dev server already running
- **Fix**: Either stop the running server or set `reuseExistingServer: true` in config

## Tips & Tricks

### Run Specific Test
```bash
pnpm test:e2e --grep "should modify transaction memo"
```

### Update Snapshots
```bash
pnpm test:e2e --update-snapshots
```

### Run Tests in Parallel
```bash
pnpm test:e2e --workers=4
```

### Run Only Changed Tests
```bash
pnpm test:e2e --only-changed
```

### Generate Test Code
```bash
pnpm exec playwright codegen http://localhost:3000
```
This opens a browser where you can interact with your app, and Playwright generates test code.

### Slow Down Tests
Useful for watching what's happening:
```typescript
test.use({ launchOptions: { slowMo: 1000 } })
```

### Take Screenshot at Any Point
```typescript
await page.screenshot({ path: 'debug.png' })
```

### Pause Test Execution
```typescript
await page.pause()
```

## Environment Variables

Create `.env.local` in `treasurer/` directory:

```bash
# Base URL for frontend (default: http://localhost:3000)
VITE_E2E_BASE_URL=http://localhost:3000

# API URL for backend (default: http://localhost:3001/api)
VITE_API_URL=http://localhost:3001/api
```

## CI/CD

Tests run automatically in GitHub Actions on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

View results in:
- GitHub Actions tab
- PR comments (test summary)
- Workflow artifacts (reports and videos)

## Getting Help

1. **Check documentation**:
   - `e2e/README.md` - Detailed documentation
   - `e2e/TEST_SUMMARY.md` - Overview of all tests

2. **Playwright docs**: https://playwright.dev

3. **Example tests**: Look at existing tests for patterns

4. **Debug tools**: Use UI mode or Debug mode to inspect failures

5. **Team**: Ask in team chat or file an issue

## Next Steps

- Read `e2e/README.md` for comprehensive documentation
- Review `e2e/TEST_SUMMARY.md` for test coverage details
- Explore test files to understand patterns
- Run tests locally before pushing changes
- Add tests for new features
