# E2E Test Map - Visual Guide

```
Transaction Edit E2E Test Suite
├── 📁 Basic Edit Flow (11 tests)
│   ├── ✓ Open modal with pre-filled data
│   ├── ✓ Edit memo → save → verify
│   ├── ✓ Edit amount → save → verify
│   ├── ✓ Edit date → save → verify
│   ├── ✓ Edit multiple fields → save → verify
│   ├── ✓ Close without saving (X button)
│   ├── ✓ Close without saving (Cancel button)
│   ├── ✓ Success notification display
│   ├── ✓ Version increment tracking
│   ├── ✓ Backdrop click to close
│   └── ✓ Body scroll prevention
│
├── 📁 Split Management (9 tests)
│   ├── ✓ Display existing splits
│   ├── ✓ Add new split
│   ├── ✓ Remove split
│   ├── ✓ Modify split category
│   ├── ✓ Modify split amount
│   ├── ✓ Validate total = transaction amount
│   ├── ✓ Display total & remaining
│   ├── ✓ Single → multiple splits
│   └── ✓ Multiple → single split
│
├── 📁 Conflict Resolution (6 tests)
│   ├── ✓ Detect stale edit attempt
│   ├── ✓ Show conflict dialog
│   ├── ✓ Keep my changes (force save)
│   ├── ✓ Use server version (reload)
│   ├── ✓ Cancel conflict dialog
│   └── ✓ Prevent ESC during conflict
│
├── 📁 Edit History (10 tests)
│   ├── ✓ Display history tab
│   ├── ✓ Open history panel
│   ├── ✓ Show all entries
│   ├── ✓ Display timestamps & users
│   ├── ✓ Expand entry details
│   ├── ✓ Show before/after values
│   ├── ✓ Chronological order
│   ├── ✓ Creation vs update
│   ├── ✓ Collapse expanded entry
│   └── ✓ Track split changes
│
├── 📁 Validation (13 tests)
│   ├── ✓ Require memo
│   ├── ✓ Require amount
│   ├── ✓ Amount > 0
│   ├── ✓ No negative amounts
│   ├── ✓ Decimal format
│   ├── ✓ Require date
│   ├── ✓ Date format validation
│   ├── ✓ Future date rules
│   ├── ✓ Multiple errors display
│   ├── ✓ Error clearing
│   ├── ✓ Reconciled protection
│   ├── ✓ Stale data warning
│   └── ✓ Permission checks
│
└── 📁 UX & Accessibility (21+ tests)
    ├── 📁 Keyboard (7 tests)
    │   ├── ✓ ESC to close
    │   ├── ✓ Cmd/Ctrl+S to save
    │   ├── ✓ Tab navigation
    │   ├── ✓ Focus trapping
    │   ├── ✓ ARIA attributes
    │   ├── ✓ Screen readers
    │   └── ✓ Touch targets
    │
    ├── 📁 Responsive (3 tests)
    │   ├── ✓ Mobile fullscreen
    │   ├── ✓ Desktop centered
    │   └── ✓ Tablet adaptive
    │
    ├── 📁 Error Handling (3 tests)
    │   ├── ✓ Network errors
    │   ├── ✓ API errors
    │   └── ✓ Timeouts
    │
    └── 📁 URL State (6 tests)
        ├── ✓ Direct URL open
        ├── ✓ URL param update
        ├── ✓ Back button
        ├── ✓ Param preservation
        ├── ✓ Invalid ID handling
        └── ✓ Param removal

Total: 70+ tests across 6 test files
```

## Test Flow Diagram

```
User Opens Edit Modal
        │
        ↓
[Basic Edit Flow Tests]
        │
        ├─→ Modify Fields → [Validation Tests]
        │                           │
        │                           ├─→ Valid? → Save
        │                           └─→ Invalid? → Show Errors
        │
        ├─→ Modify Splits → [Split Tests]
        │                           │
        │                           └─→ Total Match? → Proceed
        │
        ├─→ Save Changes → [Conflict Tests?]
        │                           │
        │                    ┌──────┴──────┐
        │                    ↓             ↓
        │                No Conflict   Conflict!
        │                    │             │
        │                    │      [Conflict Dialog]
        │                    │             │
        │                    │      ┌──────┴──────┐
        │                    │      ↓             ↓
        │                    │  Keep Mine    Use Server
        │                    │      │             │
        │                    └──────┴─────────────┘
        │                           │
        ↓                           ↓
   [Success!] ←──────────────── Version++
        │
        ↓
   [History Tests] ← Record Edit
```

## Browser & Device Coverage Matrix

```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Test Category   │ Chrome   │ Firefox  │ Safari   │ Mobile   │ Tablet   │
│                 │          │          │          │ Chrome   │          │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Basic Edit      │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
│ Splits          │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
│ Conflicts       │    ✓     │    ✓     │    ✓     │    ○     │    ○     │
│ History         │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
│ Validation      │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
│ Keyboard Nav    │    ✓     │    ✓     │    ✓     │    ○     │    ✓     │
│ Accessibility   │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
│ Responsive      │    ○     │    ○     │    ○     │    ✓     │    ✓     │
│ Error Handling  │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
│ URL State       │    ✓     │    ✓     │    ✓     │    ✓     │    ✓     │
└─────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Legend: ✓ = Primary focus, ○ = Tested but less critical
```

## Test Data Relationships

```
Test Organization (org-test-123)
    │
    └─→ Test Account (acc-test-123) - Checking Account
            │
            ├─→ Transaction 1 (txn-1)
            │   ├─ Type: EXPENSE
            │   ├─ Amount: $125.50
            │   ├─ Status: UNCLEARED
            │   ├─ Version: 1
            │   └─ Splits: [Groceries: $125.50]
            │
            ├─→ Transaction 2 (txn-2)
            │   ├─ Type: INCOME
            │   ├─ Amount: $5000.00
            │   ├─ Status: CLEARED
            │   ├─ Version: 1
            │   └─ Splits: [Salary: $5000.00]
            │
            ├─→ Transaction 3 (txn-3) ← Multi-split
            │   ├─ Type: EXPENSE
            │   ├─ Amount: $200.00
            │   ├─ Status: UNCLEARED
            │   ├─ Version: 2 (edited)
            │   └─ Splits:
            │       ├─ Dining Out: $120.00
            │       └─ Entertainment: $80.00
            │
            └─→ Transaction Reconciled (txn-reconciled)
                ├─ Type: EXPENSE
                ├─ Amount: $50.00
                ├─ Status: RECONCILED ← Cannot edit!
                ├─ Version: 1
                └─ Splits: [Utilities: $50.00]
```

## File Organization

```
treasurer/e2e/
│
├── 📋 Configuration & Setup
│   ├── global-setup.ts          (Pre-flight checks)
│   ├── README.md                (Full documentation)
│   ├── QUICK_START.md           (Developer guide)
│   ├── TEST_SUMMARY.md          (Coverage overview)
│   └── TEST_MAP.md              (This file)
│
├── 📦 Fixtures
│   ├── auth.fixture.ts          (Auth + test context)
│   └── transaction.fixture.ts   (Sample data)
│
├── 🔧 Helpers
│   └── transaction-edit.helper.ts
│       ├── TransactionEditPage
│       ├── ConflictResolutionDialog
│       └── Helper functions
│
└── 🧪 Test Files
    ├── transaction-edit-basic.e2e.ts       (11 tests)
    ├── transaction-edit-splits.e2e.ts      (9 tests)
    ├── transaction-edit-conflicts.e2e.ts   (6 tests)
    ├── transaction-edit-history.e2e.ts     (10 tests)
    ├── transaction-edit-validation.e2e.ts  (13 tests)
    └── transaction-edit-ux.e2e.ts          (21+ tests)
```

## Quick Command Reference

```bash
# 🚀 Run all tests
pnpm test:e2e

# 🎯 Run specific category
pnpm test:e2e basic
pnpm test:e2e splits
pnpm test:e2e conflicts
pnpm test:e2e history
pnpm test:e2e validation
pnpm test:e2e ux

# 🌐 Run specific browser
pnpm test:e2e:chromium    # Chrome
pnpm test:e2e:firefox     # Firefox
pnpm test:e2e:webkit      # Safari
pnpm test:e2e:mobile      # Mobile Chrome

# 🐛 Debug modes
pnpm test:e2e:ui          # Interactive UI
pnpm test:e2e:headed      # Visible browser
pnpm test:e2e:debug       # Step debugger

# 📊 View results
pnpm test:e2e:report      # HTML report
```

## Test Execution Time Estimates

```
┌───────────────────────────┬──────────┬──────────────┐
│ Test File                 │ Tests    │ Avg Duration │
├───────────────────────────┼──────────┼──────────────┤
│ Basic Edit                │    11    │   ~2.5 min   │
│ Splits                    │     9    │   ~2.0 min   │
│ Conflicts                 │     6    │   ~3.5 min   │
│ History                   │    10    │   ~2.5 min   │
│ Validation                │    13    │   ~3.0 min   │
│ UX & Accessibility        │    21+   │   ~4.5 min   │
├───────────────────────────┼──────────┼──────────────┤
│ TOTAL                     │    70+   │  ~18 minutes │
└───────────────────────────┴──────────┴──────────────┘

Note: Times vary based on system performance and network speed.
Parallel execution can reduce total time significantly.
```
