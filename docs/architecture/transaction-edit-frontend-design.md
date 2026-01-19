# Transaction Edit Frontend Architecture Design

## Overview

This document defines the frontend component architecture and state management for the transaction edit functionality in the Treasurer application. The design integrates with the existing React 18, Redux Toolkit, React Router v6, and Tailwind CSS stack.

---

## 1. Component Architecture

### 1.1 Component Tree Diagram

```
TransactionsPage
|
+-- TransactionList
|   |
|   +-- EnhancedTransactionCard (existing, enhanced)
|       |-- TransactionStatusBadge
|       |-- EditButton (triggers edit mode)
|       +-- QuickEditPopover (inline quick edits)
|
+-- TransactionEditModal
|   |
|   +-- TransactionEditForm
|   |   |-- VendorSelector (existing)
|   |   |-- HierarchicalCategorySelector (existing)
|   |   |-- TransactionSplitEditor
|   |   |   +-- SplitRow (multiple)
|   |   |-- MemoEditor
|   |   +-- DatePicker
|   |
|   +-- ConflictResolutionDialog
|   |   |-- VersionComparisonView
|   |   |-- ConflictFieldHighlight
|   |   +-- ResolutionActions
|   |
|   +-- EditHistoryPanel
|   |   |-- EditHistoryTimeline
|   |   +-- EditHistoryEntry (multiple)
|   |
|   +-- EditModalFooter
|       |-- SaveButton
|       |-- CancelButton
|       +-- VersionIndicator
|
+-- TransactionEditNotifications
    |-- ConflictToast
    +-- SaveSuccessToast
```

### 1.2 Component Descriptions

#### TransactionEditModal

**Purpose**: Primary container for transaction editing functionality.

**Design Decision**: Modal approach chosen over separate page for the following reasons:
- Context preservation: Users maintain view of transaction list
- Quick edits: Common editing scenarios complete faster
- Mobile-friendly: Modals work well on responsive layouts
- Consistent with existing status history modal pattern

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/TransactionEditModal.tsx

interface TransactionEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Transaction to edit */
  transaction: EditableTransaction | null;
  /** Organization ID for API calls */
  orgId: string;
  /** Account ID for API calls */
  accountId: string;
}

interface TransactionEditModalState {
  /** Current form data */
  formData: TransactionEditFormData;
  /** Original transaction for conflict comparison */
  originalTransaction: EditableTransaction | null;
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Current edit step (form, conflict, history) */
  activePanel: 'form' | 'conflict' | 'history';
}
```

#### TransactionEditForm

**Purpose**: Manages form state and field rendering for transaction edits.

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/TransactionEditForm.tsx

interface TransactionEditFormProps {
  /** Initial transaction data */
  initialData: TransactionEditFormData;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Field-level validation errors */
  errors: TransactionEditErrors;
  /** Whether transaction is reconciled (limits edits) */
  isReconciled: boolean;
  /** Callback when form data changes */
  onChange: (data: TransactionEditFormData) => void;
  /** Callback when form is submitted */
  onSubmit: (data: TransactionEditFormData) => void;
  /** Optional: Transaction version for display */
  version?: number;
}

interface TransactionEditFormData {
  description: string;
  amount: number;
  transactionType: TransactionType;
  date: string;
  vendorId: string | null;
  memo: string | null;
  splits: TransactionSplitData[];
  applyFee: boolean;
  /** Version for optimistic locking */
  version: number;
}

interface TransactionEditErrors {
  description?: string;
  amount?: string;
  date?: string;
  splits?: string;
  general?: string;
}
```

#### ConflictResolutionDialog

**Purpose**: Handles 409 Conflict scenarios when concurrent edits are detected.

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/ConflictResolutionDialog.tsx

interface ConflictResolutionDialogProps {
  /** Whether dialog is visible */
  isOpen: boolean;
  /** User's attempted changes */
  userChanges: TransactionEditFormData;
  /** Current server state */
  serverData: EditableTransaction;
  /** Callback when user chooses to reload */
  onReload: () => void;
  /** Callback when user chooses to force save */
  onForceSave: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether force save is in progress */
  isSaving: boolean;
}
```

#### EditHistoryPanel

**Purpose**: Displays audit trail of transaction edits.

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/EditHistoryPanel.tsx

interface EditHistoryPanelProps {
  /** Transaction ID */
  transactionId: string;
  /** Organization ID */
  orgId: string;
  /** Account ID */
  accountId: string;
  /** Whether panel is expanded */
  isExpanded: boolean;
  /** Toggle expansion */
  onToggle: () => void;
}

interface EditHistoryEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE';
  timestamp: string;
  userId: string;
  userName: string;
  changes: FieldChange[];
}

interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
```

#### QuickEditPopover

**Purpose**: Inline editing for simple field updates without opening full modal.

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/QuickEditPopover.tsx

interface QuickEditPopoverProps {
  /** Transaction to edit */
  transaction: AccountTransaction;
  /** Field being edited */
  field: 'memo' | 'date' | 'description';
  /** Whether popover is open */
  isOpen: boolean;
  /** Close popover */
  onClose: () => void;
  /** Save changes */
  onSave: (value: string) => Promise<void>;
}
```

---

## 2. State Management Design

### 2.1 Redux Slice Updates

#### Enhanced Transaction Slice

```typescript
// /home/don/dev/treasurer2026/treasurer/src/store/features/transactionSlice.ts (updates)

interface TransactionState {
  // Existing fields
  transactions: AccountTransaction[];
  categories: TransactionCategory[];
  total: number;
  selectedTransaction: AccountTransaction | null;
  isLoading: boolean;
  error: string | null;

  // NEW: Edit-related state
  editState: {
    /** Transaction currently being edited */
    editingTransaction: EditableTransaction | null;
    /** Whether edit modal is open */
    isEditModalOpen: boolean;
    /** Form data for the edit */
    editFormData: TransactionEditFormData | null;
    /** Whether form has been modified */
    isDirty: boolean;
    /** Field-level validation errors */
    validationErrors: TransactionEditErrors;
    /** Whether save is in progress */
    isSaving: boolean;
    /** Save error message */
    saveError: string | null;
    /** Conflict state */
    conflictState: ConflictState | null;
  };

  // NEW: Edit history state
  editHistory: {
    /** History entries for current transaction */
    entries: EditHistoryEntry[];
    /** Loading state */
    isLoading: boolean;
    /** Error message */
    error: string | null;
  };
}

interface ConflictState {
  /** Server's current version */
  serverVersion: number;
  /** Server's current data */
  serverData: EditableTransaction;
  /** User's attempted changes */
  userChanges: TransactionEditFormData;
  /** Timestamp of conflict detection */
  detectedAt: string;
}

interface EditableTransaction extends AccountTransaction {
  /** Version number for optimistic locking */
  version: number;
  /** Last modified by user info */
  lastModifiedBy?: {
    id: string;
    name: string;
    email: string;
  };
  /** Creation user info */
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  /** Edit history (summary) */
  editHistory?: {
    totalEdits: number;
    lastEditAt: string;
  };
  /** Vendor details */
  vendor?: Vendor | null;
  /** Additional memo */
  memo: string | null;
}
```

#### New Actions

```typescript
// Synchronous actions
const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    // Existing actions...

    // NEW: Edit modal actions
    openEditModal: (state, action: PayloadAction<EditableTransaction>) => {
      state.editState.editingTransaction = action.payload;
      state.editState.isEditModalOpen = true;
      state.editState.editFormData = transactionToFormData(action.payload);
      state.editState.isDirty = false;
      state.editState.validationErrors = {};
      state.editState.saveError = null;
      state.editState.conflictState = null;
    },

    closeEditModal: (state) => {
      state.editState.isEditModalOpen = false;
      state.editState.editingTransaction = null;
      state.editState.editFormData = null;
      state.editState.isDirty = false;
      state.editState.validationErrors = {};
      state.editState.saveError = null;
      state.editState.conflictState = null;
    },

    updateEditFormData: (state, action: PayloadAction<Partial<TransactionEditFormData>>) => {
      if (state.editState.editFormData) {
        state.editState.editFormData = {
          ...state.editState.editFormData,
          ...action.payload,
        };
        state.editState.isDirty = true;
      }
    },

    setValidationErrors: (state, action: PayloadAction<TransactionEditErrors>) => {
      state.editState.validationErrors = action.payload;
    },

    clearValidationErrors: (state) => {
      state.editState.validationErrors = {};
    },

    setConflictState: (state, action: PayloadAction<ConflictState>) => {
      state.editState.conflictState = action.payload;
    },

    clearConflictState: (state) => {
      state.editState.conflictState = null;
    },

    resolveConflictWithReload: (state, action: PayloadAction<EditableTransaction>) => {
      // Reload server data and reset form
      state.editState.editingTransaction = action.payload;
      state.editState.editFormData = transactionToFormData(action.payload);
      state.editState.isDirty = false;
      state.editState.conflictState = null;
    },
  },
});

// Async thunks
export const fetchTransactionForEdit = createAsyncThunk(
  'transaction/fetchForEdit',
  async (
    { orgId, accountId, transactionId }: FetchTransactionParams,
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.get(orgId, accountId, transactionId);
      return response.data.transaction as EditableTransaction;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch transaction');
    }
  }
);

export const saveTransactionEdit = createAsyncThunk(
  'transaction/saveEdit',
  async (
    {
      orgId,
      accountId,
      transactionId,
      data,
      version,
    }: SaveTransactionEditParams,
    { rejectWithValue, dispatch }
  ) => {
    try {
      const response = await transactionApi.update(orgId, accountId, transactionId, {
        ...data,
        version, // Include version for optimistic locking
      });
      return response.data.transaction as EditableTransaction;
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle 409 Conflict specifically
        if (error.status === 409) {
          // Fetch latest version for conflict resolution
          const latestResponse = await transactionApi.get(orgId, accountId, transactionId);
          return rejectWithValue({
            type: 'CONFLICT',
            serverData: latestResponse.data.transaction,
            message: error.message,
          });
        }
        return rejectWithValue({
          type: 'ERROR',
          message: error.message,
        });
      }
      return rejectWithValue({
        type: 'ERROR',
        message: 'Failed to save transaction',
      });
    }
  }
);

export const forceSaveTransactionEdit = createAsyncThunk(
  'transaction/forceSaveEdit',
  async (
    {
      orgId,
      accountId,
      transactionId,
      data,
      forceVersion,
    }: ForceSaveTransactionEditParams,
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.update(orgId, accountId, transactionId, {
        ...data,
        version: forceVersion,
        forceUpdate: true, // Backend flag to bypass version check
      });
      return response.data.transaction as EditableTransaction;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to save transaction');
    }
  }
);

export const fetchEditHistory = createAsyncThunk(
  'transaction/fetchEditHistory',
  async (
    { orgId, accountId, transactionId }: FetchTransactionParams,
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.getEditHistory(orgId, accountId, transactionId);
      return response.data.history;
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch edit history');
    }
  }
);
```

#### Selectors

```typescript
// Existing selectors...

// NEW: Edit-related selectors
export const selectIsEditModalOpen = (state: RootState) =>
  state.transaction.editState.isEditModalOpen;

export const selectEditingTransaction = (state: RootState) =>
  state.transaction.editState.editingTransaction;

export const selectEditFormData = (state: RootState) =>
  state.transaction.editState.editFormData;

export const selectIsEditDirty = (state: RootState) =>
  state.transaction.editState.isDirty;

export const selectEditValidationErrors = (state: RootState) =>
  state.transaction.editState.validationErrors;

export const selectIsEditSaving = (state: RootState) =>
  state.transaction.editState.isSaving;

export const selectEditSaveError = (state: RootState) =>
  state.transaction.editState.saveError;

export const selectConflictState = (state: RootState) =>
  state.transaction.editState.conflictState;

export const selectHasConflict = (state: RootState) =>
  state.transaction.editState.conflictState !== null;

export const selectEditHistory = (state: RootState) =>
  state.transaction.editHistory.entries;

export const selectIsEditHistoryLoading = (state: RootState) =>
  state.transaction.editHistory.isLoading;

// Computed selectors
export const selectCanSaveEdit = createSelector(
  [selectEditFormData, selectEditValidationErrors, selectIsEditSaving, selectHasConflict],
  (formData, errors, isSaving, hasConflict) => {
    if (!formData || isSaving || hasConflict) return false;
    if (Object.keys(errors).length > 0) return false;

    // Validate required fields
    if (!formData.description?.trim()) return false;
    if (formData.amount <= 0) return false;
    if (formData.splits.length === 0) return false;

    // Validate splits total equals amount
    const splitsTotal = formData.splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsTotal - formData.amount) > 0.01) return false;

    return true;
  }
);

export const selectEditFormDataWithChanges = createSelector(
  [selectEditingTransaction, selectEditFormData],
  (original, current) => {
    if (!original || !current) return null;

    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

    if (original.description !== current.description) {
      changes.push({ field: 'description', oldValue: original.description, newValue: current.description });
    }
    if (parseFloat(original.amount) !== current.amount) {
      changes.push({ field: 'amount', oldValue: original.amount, newValue: current.amount });
    }
    // ... more field comparisons

    return { formData: current, changes, hasChanges: changes.length > 0 };
  }
);
```

### 2.2 Form State Handling

The design uses **controlled form components** with Redux for the following reasons:

1. **Undo/Redo Support**: Redux state enables time-travel debugging and potential undo
2. **Cross-component State**: Conflict resolution needs access to form data
3. **Persistence**: Form state survives re-renders and can be persisted
4. **Validation Centralization**: Single source of truth for validation state

```typescript
// /home/don/dev/treasurer2026/treasurer/src/hooks/useTransactionEditForm.ts

interface UseTransactionEditFormOptions {
  orgId: string;
  accountId: string;
  transactionId: string;
}

interface UseTransactionEditFormReturn {
  /** Current form data */
  formData: TransactionEditFormData | null;
  /** Whether form has unsaved changes */
  isDirty: boolean;
  /** Validation errors by field */
  errors: TransactionEditErrors;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Save error message */
  saveError: string | null;
  /** Whether there's a conflict */
  hasConflict: boolean;
  /** Conflict state if present */
  conflictState: ConflictState | null;
  /** Update a form field */
  updateField: <K extends keyof TransactionEditFormData>(
    field: K,
    value: TransactionEditFormData[K]
  ) => void;
  /** Update multiple fields */
  updateFields: (updates: Partial<TransactionEditFormData>) => void;
  /** Validate entire form */
  validate: () => boolean;
  /** Validate single field */
  validateField: (field: keyof TransactionEditFormData) => string | undefined;
  /** Save the transaction */
  save: () => Promise<boolean>;
  /** Force save (override conflict) */
  forceSave: () => Promise<boolean>;
  /** Reload from server */
  reload: () => Promise<void>;
  /** Reset form to original values */
  reset: () => void;
}

export function useTransactionEditForm({
  orgId,
  accountId,
  transactionId,
}: UseTransactionEditFormOptions): UseTransactionEditFormReturn {
  const dispatch = useAppDispatch();

  const formData = useAppSelector(selectEditFormData);
  const isDirty = useAppSelector(selectIsEditDirty);
  const errors = useAppSelector(selectEditValidationErrors);
  const isSaving = useAppSelector(selectIsEditSaving);
  const saveError = useAppSelector(selectEditSaveError);
  const conflictState = useAppSelector(selectConflictState);
  const hasConflict = useAppSelector(selectHasConflict);
  const editingTransaction = useAppSelector(selectEditingTransaction);

  const updateField = useCallback(<K extends keyof TransactionEditFormData>(
    field: K,
    value: TransactionEditFormData[K]
  ) => {
    dispatch(updateEditFormData({ [field]: value }));

    // Clear field error on change
    if (errors[field as keyof TransactionEditErrors]) {
      dispatch(setValidationErrors({
        ...errors,
        [field]: undefined,
      }));
    }
  }, [dispatch, errors]);

  const updateFields = useCallback((updates: Partial<TransactionEditFormData>) => {
    dispatch(updateEditFormData(updates));
  }, [dispatch]);

  const validate = useCallback((): boolean => {
    const newErrors: TransactionEditErrors = {};

    if (!formData) return false;

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (formData.splits.length === 0) {
      newErrors.splits = 'At least one category split is required';
    } else {
      const splitsTotal = formData.splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitsTotal - formData.amount) > 0.01) {
        newErrors.splits = 'Split amounts must equal transaction amount';
      }
    }

    dispatch(setValidationErrors(newErrors));
    return Object.keys(newErrors).length === 0;
  }, [dispatch, formData]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!validate() || !formData || !editingTransaction) return false;

    try {
      await dispatch(saveTransactionEdit({
        orgId,
        accountId,
        transactionId,
        data: formData,
        version: editingTransaction.version,
      })).unwrap();
      return true;
    } catch (error) {
      // Conflict handling is done in the thunk
      return false;
    }
  }, [dispatch, validate, formData, editingTransaction, orgId, accountId, transactionId]);

  const forceSave = useCallback(async (): Promise<boolean> => {
    if (!formData || !conflictState) return false;

    try {
      await dispatch(forceSaveTransactionEdit({
        orgId,
        accountId,
        transactionId,
        data: formData,
        forceVersion: conflictState.serverVersion,
      })).unwrap();
      return true;
    } catch {
      return false;
    }
  }, [dispatch, formData, conflictState, orgId, accountId, transactionId]);

  const reload = useCallback(async (): Promise<void> => {
    const result = await dispatch(fetchTransactionForEdit({
      orgId,
      accountId,
      transactionId,
    })).unwrap();
    dispatch(resolveConflictWithReload(result));
  }, [dispatch, orgId, accountId, transactionId]);

  const reset = useCallback(() => {
    if (editingTransaction) {
      dispatch(updateEditFormData(transactionToFormData(editingTransaction)));
    }
  }, [dispatch, editingTransaction]);

  return {
    formData,
    isDirty,
    errors,
    isSaving,
    saveError,
    hasConflict,
    conflictState,
    updateField,
    updateFields,
    validate,
    validateField: (field) => errors[field as keyof TransactionEditErrors],
    save,
    forceSave,
    reload,
    reset,
  };
}
```

---

## 3. Routing Structure

### 3.1 URL State Approach

**Decision**: Use URL query parameters for edit mode, not separate routes.

**Rationale**:
- Maintains transaction list context
- Supports deep linking to edit mode
- Works with browser back button
- Enables sharing of edit links

```typescript
// URL pattern
/organizations/:orgId/accounts/:accountId/transactions?edit=:transactionId

// Examples
/organizations/123/accounts/456/transactions?edit=789
/organizations/123/accounts/456/transactions?edit=789&tab=history
```

### 3.2 Router Integration

```typescript
// /home/don/dev/treasurer2026/treasurer/src/pages/TransactionsPage.tsx (updates)

import { useSearchParams } from 'react-router-dom';

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editTransactionId = searchParams.get('edit');
  const editTab = searchParams.get('tab') as 'form' | 'history' | null;

  const dispatch = useAppDispatch();
  const { orgId, accountId } = useParams<{ orgId: string; accountId: string }>();

  // Open edit modal when URL has edit param
  useEffect(() => {
    if (editTransactionId && orgId && accountId) {
      dispatch(fetchTransactionForEdit({
        orgId,
        accountId,
        transactionId: editTransactionId,
      })).then((result) => {
        if (fetchTransactionForEdit.fulfilled.match(result)) {
          dispatch(openEditModal(result.payload));
        }
      });
    }
  }, [editTransactionId, orgId, accountId, dispatch]);

  // Handle opening edit mode
  const handleEditTransaction = useCallback((transaction: AccountTransaction) => {
    setSearchParams({ edit: transaction.id });
  }, [setSearchParams]);

  // Handle closing edit mode
  const handleCloseEdit = useCallback(() => {
    dispatch(closeEditModal());
    setSearchParams({});
  }, [dispatch, setSearchParams]);

  // Handle showing history tab
  const handleShowHistory = useCallback(() => {
    if (editTransactionId) {
      setSearchParams({ edit: editTransactionId, tab: 'history' });
    }
  }, [editTransactionId, setSearchParams]);

  return (
    <>
      {/* ... existing transaction list UI ... */}

      <TransactionEditModal
        isOpen={!!editTransactionId}
        onClose={handleCloseEdit}
        initialTab={editTab || 'form'}
        onShowHistory={handleShowHistory}
        transaction={editingTransaction}
        orgId={orgId!}
        accountId={accountId!}
      />
    </>
  );
}
```

---

## 4. Data Fetching Patterns

### 4.1 Transaction Fetch for Editing

```typescript
// /home/don/dev/treasurer2026/treasurer/src/lib/api/transactions.ts (updates)

export interface TransactionWithEditInfo extends AccountTransaction {
  version: number;
  memo: string | null;
  vendorId: string | null;
  vendor?: Vendor | null;
  createdBy?: UserSummary;
  lastModifiedBy?: UserSummary;
  editHistory?: {
    totalEdits: number;
    lastEditAt: string;
  };
}

interface TransactionWithEditInfoResponse {
  success: boolean;
  data: {
    transaction: TransactionWithEditInfo;
  };
}

interface EditHistoryResponse {
  success: boolean;
  data: {
    history: EditHistoryEntry[];
  };
}

export const transactionApi = {
  // ... existing methods ...

  /** Get transaction with full edit information */
  getForEdit: (orgId: string, accountId: string, transactionId: string) =>
    api.get<TransactionWithEditInfoResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
      { params: { include: 'editInfo,vendor,createdBy,lastModifiedBy' } }
    ),

  /** Get edit history for a transaction */
  getEditHistory: (orgId: string, accountId: string, transactionId: string) =>
    api.get<EditHistoryResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`
    ),

  /** Update with version for optimistic locking */
  updateWithVersion: (
    orgId: string,
    accountId: string,
    transactionId: string,
    data: UpdateTransactionWithVersionInput
  ) =>
    api.patch<TransactionWithEditInfoResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
      data
    ),
};

export interface UpdateTransactionWithVersionInput extends UpdateTransactionInput {
  /** Version for optimistic locking */
  version: number;
  /** Force update even if version mismatch */
  forceUpdate?: boolean;
}
```

### 4.2 Stale Data Handling

```typescript
// /home/don/dev/treasurer2026/treasurer/src/hooks/useTransactionFreshness.ts

interface UseTransactionFreshnessOptions {
  transaction: EditableTransaction | null;
  /** Maximum age in milliseconds before showing stale warning */
  maxAge?: number;
  /** Polling interval for freshness check */
  pollInterval?: number;
}

interface UseTransactionFreshnessReturn {
  /** Whether data is considered stale */
  isStale: boolean;
  /** Time since last update */
  age: number;
  /** Whether newer version exists on server */
  hasNewerVersion: boolean;
  /** Refresh from server */
  refresh: () => Promise<void>;
  /** Last check timestamp */
  lastChecked: Date | null;
}

export function useTransactionFreshness({
  transaction,
  maxAge = 5 * 60 * 1000, // 5 minutes default
  pollInterval = 30 * 1000, // 30 seconds default
}: UseTransactionFreshnessOptions): UseTransactionFreshnessReturn {
  const [isStale, setIsStale] = useState(false);
  const [hasNewerVersion, setHasNewerVersion] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Calculate age based on updatedAt
  const age = useMemo(() => {
    if (!transaction) return 0;
    return Date.now() - new Date(transaction.updatedAt).getTime();
  }, [transaction]);

  // Check for newer version periodically
  useEffect(() => {
    if (!transaction) return;

    const checkVersion = async () => {
      try {
        // Lightweight version check endpoint
        const response = await api.get<{ version: number }>(
          `/organizations/${transaction.accountId}/.../version/${transaction.id}`
        );
        setHasNewerVersion(response.version > transaction.version);
        setLastChecked(new Date());
      } catch {
        // Ignore errors, just mark as stale
        setIsStale(true);
      }
    };

    const interval = setInterval(checkVersion, pollInterval);
    return () => clearInterval(interval);
  }, [transaction, pollInterval]);

  // Mark as stale based on age
  useEffect(() => {
    setIsStale(age > maxAge || hasNewerVersion);
  }, [age, maxAge, hasNewerVersion]);

  const refresh = useCallback(async () => {
    // Trigger refresh through Redux
    // Implementation depends on how modal state is managed
  }, []);

  return {
    isStale,
    age,
    hasNewerVersion,
    refresh,
    lastChecked,
  };
}
```

### 4.3 Refresh Strategies After Edit

```typescript
// After successful save, update both the list and close the modal

// In transactionSlice extraReducers:
.addCase(saveTransactionEdit.fulfilled, (state, action) => {
  state.editState.isSaving = false;
  state.editState.isEditModalOpen = false;
  state.editState.editingTransaction = null;
  state.editState.editFormData = null;
  state.editState.isDirty = false;

  // Update transaction in list
  const index = state.transactions.findIndex(t => t.id === action.payload.id);
  if (index !== -1) {
    state.transactions[index] = action.payload;
  }

  // Update selected transaction if it was the one edited
  if (state.selectedTransaction?.id === action.payload.id) {
    state.selectedTransaction = action.payload;
  }
})
```

---

## 5. Accessibility Requirements

### 5.1 Form Validation and Error Announcements

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/FormErrorAnnouncer.tsx

interface FormErrorAnnouncerProps {
  errors: TransactionEditErrors;
}

/**
 * Announces form errors to screen readers using aria-live region.
 */
export function FormErrorAnnouncer({ errors }: FormErrorAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const errorMessages = Object.entries(errors)
      .filter(([, value]) => value)
      .map(([key, value]) => `${formatFieldName(key)}: ${value}`);

    if (errorMessages.length > 0) {
      setAnnouncement(
        `Form has ${errorMessages.length} error${errorMessages.length > 1 ? 's' : ''}. ` +
        errorMessages.join('. ')
      );
    } else {
      setAnnouncement('');
    }
  }, [errors]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
```

### 5.2 Keyboard Navigation

```typescript
// /home/don/dev/treasurer2026/treasurer/src/hooks/useEditModalKeyboard.ts

interface UseEditModalKeyboardOptions {
  isOpen: boolean;
  isDirty: boolean;
  onSave: () => void;
  onClose: () => void;
  onShowHistory: () => void;
}

export function useEditModalKeyboard({
  isOpen,
  isDirty,
  onSave,
  onClose,
  onShowHistory,
}: UseEditModalKeyboardOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
        return;
      }

      // Cmd/Ctrl + H to toggle history
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        onShowHistory();
        return;
      }

      // Escape to close (with dirty check)
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isDirty) {
          // Show confirmation dialog
          // This would be handled by a state flag
        } else {
          onClose();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, onSave, onClose, onShowHistory]);
}
```

### 5.3 Screen Reader Support for Conflict Resolution

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/ConflictResolutionDialog.tsx

export function ConflictResolutionDialog({
  isOpen,
  userChanges,
  serverData,
  onReload,
  onForceSave,
  onCancel,
  isSaving,
}: ConflictResolutionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      firstFocusRef.current?.focus();
    }
  }, [isOpen]);

  const changedFields = useMemo(() => {
    return getChangedFields(userChanges, serverData);
  }, [userChanges, serverData]);

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      aria-describedby="conflict-description"
      className="fixed inset-0 z-60 flex items-center justify-center"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 id="conflict-title" className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <span aria-hidden="true">!</span>
            Edit Conflict Detected
          </h2>
          <p id="conflict-description" className="mt-2 text-sm text-gray-600">
            This transaction was modified by another user while you were editing.
            Your changes may overwrite their updates.
          </p>
        </div>

        {/* Changed fields comparison */}
        <div className="p-6" role="list" aria-label="Changed fields">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Fields that differ:
          </h3>
          {changedFields.map((field) => (
            <div
              key={field.name}
              role="listitem"
              className="mb-4 p-3 bg-gray-50 rounded"
            >
              <span className="font-medium text-gray-900">{field.label}</span>
              <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Server value:</span>
                  <div className="font-mono text-gray-900">{field.serverValue}</div>
                </div>
                <div>
                  <span className="text-gray-500">Your value:</span>
                  <div className="font-mono text-blue-600">{field.userValue}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-3">
          <Button
            ref={firstFocusRef}
            variant="outline"
            onClick={onReload}
            className="flex-1"
          >
            Reload Their Changes
            <span className="sr-only">(discard your edits)</span>
          </Button>
          <Button
            variant="primary"
            onClick={onForceSave}
            isLoading={isSaving}
            className="flex-1"
          >
            Save My Changes
            <span className="sr-only">(overwrite their edits)</span>
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 5.4 Accessibility Checklist

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Form labels associated with inputs | `htmlFor` attributes | Required |
| Error messages linked to fields | `aria-describedby` on inputs | Required |
| Live region for dynamic errors | `aria-live="polite"` announcer | Required |
| Modal focus trap | Focus on first element, cycle with Tab | Required |
| Escape key closes modal | `keydown` handler | Required |
| Save keyboard shortcut | Cmd/Ctrl + S | Required |
| Conflict dialog as alertdialog | `role="alertdialog"` | Required |
| Visual focus indicators | `:focus-visible` styles | Required |
| Sufficient color contrast | 4.5:1 for text, 3:1 for UI | Required |
| Touch targets minimum 44x44 | Tailwind sizing | Required |
| Screen reader-only help text | `.sr-only` class | Required |
| Loading state announcements | Button loading state | Required |

---

## 6. Responsive Design Strategy

### 6.1 Breakpoint Strategy

```typescript
// Tailwind breakpoints used:
// sm: 640px - Mobile landscape / large phones
// md: 768px - Tablets
// lg: 1024px - Small laptops
// xl: 1280px - Desktops
```

### 6.2 Mobile Edit Experience

**Design**: Full-screen modal on mobile (< 768px)

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/TransactionEditModal.tsx

export function TransactionEditModal({
  isOpen,
  onClose,
  transaction,
  orgId,
  accountId,
}: TransactionEditModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - hidden on mobile (full screen) */}
          <motion.div
            className="hidden md:block fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Modal container */}
          <motion.div
            className={`
              fixed z-50 bg-white
              /* Mobile: full screen */
              inset-0
              /* Tablet+: centered modal */
              md:inset-auto md:left-1/2 md:top-1/2
              md:-translate-x-1/2 md:-translate-y-1/2
              md:max-w-2xl md:w-full md:max-h-[85vh]
              md:rounded-lg md:shadow-xl
            `}
          >
            {/* Mobile header with back button */}
            <div className="md:hidden flex items-center gap-4 px-4 py-3 border-b">
              <button
                onClick={onClose}
                className="p-2 -ml-2 text-gray-500"
                aria-label="Close"
              >
                <svg className="w-6 h-6" /* back arrow *//>
              </button>
              <h2 className="text-lg font-semibold">Edit Transaction</h2>
            </div>

            {/* Desktop header */}
            <div className="hidden md:flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Transaction</h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" /* close X *//>
              </button>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <TransactionEditForm /* ... */ />
            </div>

            {/* Footer - sticky on mobile */}
            <div className={`
              border-t bg-white p-4
              /* Mobile: sticky at bottom */
              sticky bottom-0
              /* Desktop: normal flow */
              md:static md:px-6 md:py-4
            `}>
              <div className="flex gap-3 md:justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 md:flex-initial"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  isLoading={isSaving}
                  className="flex-1 md:flex-initial"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### 6.3 Form Layout Responsiveness

```typescript
// TransactionEditForm responsive layout

<form className="space-y-6">
  {/* Single column on mobile, 2-column grid on tablet+ */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label htmlFor="description">Description</Label>
      <Input id="description" /* ... */ />
    </div>
    <div>
      <Label htmlFor="amount">Amount</Label>
      <Input id="amount" type="number" /* ... */ />
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label htmlFor="type">Type</Label>
      <Select id="type" /* ... */ />
    </div>
    <div>
      <Label htmlFor="date">Date</Label>
      <Input id="date" type="date" /* ... */ />
    </div>
  </div>

  {/* Vendor selector - full width */}
  <VendorSelector /* ... */ />

  {/* Category splits - stacked cards on mobile */}
  <div className="space-y-4">
    <Label>Category Splits</Label>
    {splits.map((split, index) => (
      <div
        key={split.id}
        className={`
          p-4 border rounded-lg
          /* Mobile: stacked layout */
          space-y-4
          /* Tablet+: inline layout */
          md:flex md:items-center md:gap-4 md:space-y-0
        `}
      >
        <div className="flex-1">
          <HierarchicalCategorySelector /* ... */ />
        </div>
        <div className="w-full md:w-32">
          <Input type="number" placeholder="Amount" /* ... */ />
        </div>
        <Button variant="ghost" size="sm" onClick={() => removeSplit(index)}>
          Remove
        </Button>
      </div>
    ))}
  </div>

  {/* Memo - full width textarea */}
  <div>
    <Label htmlFor="memo">Memo (optional)</Label>
    <textarea
      id="memo"
      className="w-full min-h-[80px] md:min-h-[60px]"
      /* ... */
    />
  </div>
</form>
```

---

## 7. Error Handling

### 7.1 Field Validation Errors

```typescript
// /home/don/dev/treasurer2026/treasurer/src/lib/validations/transactionEdit.ts

import { z } from 'zod';

export const transactionEditSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(255, 'Description must be 255 characters or less'),

  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(999999999.99, 'Amount exceeds maximum'),

  transactionType: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),

  vendorId: z.string().uuid().nullable(),

  memo: z
    .string()
    .max(1000, 'Memo must be 1000 characters or less')
    .nullable(),

  splits: z
    .array(
      z.object({
        amount: z.number().positive('Split amount must be positive'),
        categoryName: z.string().min(1, 'Category is required'),
        categoryId: z.string().uuid().optional(),
      })
    )
    .min(1, 'At least one category split is required'),

  applyFee: z.boolean(),

  version: z.number().int().nonnegative(),
});

export type TransactionEditInput = z.infer<typeof transactionEditSchema>;

/**
 * Validates that splits sum to transaction amount.
 */
export function validateSplitsTotal(
  amount: number,
  splits: Array<{ amount: number }>
): string | null {
  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Math.abs(total - amount);

  if (diff > 0.01) {
    return `Split total ($${total.toFixed(2)}) does not match transaction amount ($${amount.toFixed(2)})`;
  }

  return null;
}
```

### 7.2 Network Error Handling

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/EditErrorBoundary.tsx

interface EditErrorBoundaryProps {
  error: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}

export function EditErrorDisplay({
  error,
  onRetry,
  onDismiss,
}: EditErrorBoundaryProps) {
  if (!error) return null;

  const isNetworkError = error.includes('network') || error.includes('fetch');

  return (
    <div
      role="alert"
      className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-red-500">
          <svg className="w-5 h-5" /* error icon */ />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-red-800">
            {isNetworkError ? 'Connection Error' : 'Save Failed'}
          </h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <div className="mt-3 flex gap-3">
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try Again
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 7.3 409 Conflict Handling Flow

```
User clicks Save
       |
       v
+------+-------+
| Save Request |
+------+-------+
       |
       v
+------+--------+
| Response?     |
+---+------+----+
    |      |
 200 OK   409 Conflict
    |      |
    v      v
+-------+  +----------------+
| Close |  | Show Conflict  |
| Modal |  | Resolution UI  |
+-------+  +-------+--------+
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
  +---------+  +--------+  +--------+
  | Reload  |  | Force  |  | Cancel |
  | Server  |  | Save   |  |        |
  | Data    |  |        |  |        |
  +----+----+  +----+---+  +---+----+
       |            |          |
       v            v          v
  +--------+   +--------+  +--------+
  | Reset  |   | Close  |  | Stay   |
  | Form   |   | Modal  |  | in     |
  +--------+   +--------+  | Edit   |
                           +--------+
```

### 7.4 Reconciled Transaction Edit Prevention

```typescript
// Transactions with status "RECONCILED" cannot be edited

// In TransactionsPage or EnhancedTransactionCard:
const handleEditClick = (transaction: AccountTransaction) => {
  const status = (transaction as AccountTransaction & { status?: TransactionStatus }).status;

  if (status === 'RECONCILED') {
    // Show toast or inline message
    toast.error('Reconciled transactions cannot be edited');
    return;
  }

  setSearchParams({ edit: transaction.id });
};

// In the edit form, if somehow a reconciled transaction is loaded:
{isReconciled && (
  <div
    role="alert"
    className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
  >
    <p className="text-yellow-800">
      This transaction has been reconciled and cannot be edited.
      Contact an administrator if changes are required.
    </p>
  </div>
)}

// Disable all form fields
<Input disabled={isReconciled || isLoading} /* ... */ />
```

---

## 8. State Flow Diagrams

### 8.1 Edit Modal State Machine

```
                    +-------------------+
                    |                   |
                    |      CLOSED       |
                    |                   |
                    +--------+----------+
                             |
                             | openEditModal(transaction)
                             v
                    +--------+----------+
                    |                   |
                    |     LOADING       |
                    | (fetching data)   |
                    +--------+----------+
                             |
           +-----------------+------------------+
           |                                    |
           | success                            | error
           v                                    v
  +--------+----------+              +----------+--------+
  |                   |              |                   |
  |     EDITING       |              |   LOAD_ERROR      |
  | (form displayed)  |              |                   |
  +--------+----------+              +----------+--------+
           |                                    |
           +------------------------------------+
           |                                    |
           | retry                              | close
           |                                    |
           v                                    v
  +--------+----------+              +----------+--------+
  |     LOADING       |              |      CLOSED       |
  +-------------------+              +-------------------+

From EDITING:

  +-------------------+
  |     EDITING       |
  +--------+----------+
           |
           +------------+-------------+------------+
           |            |             |            |
           | save       | cancel      | showHist   | close(dirty)
           v            v             v            v
  +--------+----+  +----+----+  +-----+-----+  +---+-------+
  |   SAVING    |  |  CLOSED |  |  HISTORY  |  | CONFIRM   |
  +------+------+  +---------+  +-----+-----+  | DISCARD   |
         |                            |        +-----+-----+
         +--------+--------+          |              |
         |        |        |          | backToForm   +---> CLOSED
         v        v        v          v              |
    +----+--+ +---+---+ +--+---+  +---+----+         +---> EDITING
    |SUCCESS| |ERROR  | |CONFLICT| |EDITING|
    +---+---+ +---+---+ +---+----+ +--------+
        |         |         |
        v         v         |
    +---+---+ +---+---+     |
    |CLOSED | |EDITING|     |
    +-------+ +-------+     |
                            v
                    +-------+--------+
                    |   RESOLVING    |
                    +-------+--------+
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
        +-----+----+  +-----+----+  +-----+----+
        |  reload  |  |  force   |  |  cancel  |
        | (reset)  |  |  save    |  |          |
        +----+-----+  +----+-----+  +----+-----+
             |             |             |
             v             v             v
        +----+----+   +----+----+   +----+----+
        | EDITING |   | CLOSED  |   | EDITING |
        +---------+   +---------+   +---------+
```

### 8.2 Form Data Flow

```
+------------------+     +------------------+     +------------------+
|  TransactionAPI  |---->|  Redux Store     |---->|  Components      |
|  (fetch)         |     |  (state)         |     |  (render)        |
+------------------+     +------------------+     +------------------+
                                 ^                        |
                                 |                        |
                                 |    updateField()       |
                                 +------------------------+

Detailed Flow:

1. User clicks Edit
   TransactionsPage -> dispatch(openEditModal(tx))

2. Modal opens, fetches fresh data
   TransactionEditModal -> dispatch(fetchTransactionForEdit({...}))

3. Data arrives, populates form
   Redux: editState.editingTransaction = payload
   Redux: editState.editFormData = transactionToFormData(payload)

4. User modifies field
   TransactionEditForm -> useTransactionEditForm.updateField('memo', 'new value')
   -> dispatch(updateEditFormData({ memo: 'new value' }))
   -> Redux: editState.editFormData.memo = 'new value'
   -> Redux: editState.isDirty = true

5. User saves
   TransactionEditForm -> useTransactionEditForm.save()
   -> validate()
   -> dispatch(saveTransactionEdit({...}))
   -> API call with version

6a. Success
   Redux: Update transactions list
   Redux: Close modal, clear edit state

6b. Conflict (409)
   -> API returns 409
   -> Thunk fetches latest version
   -> dispatch sets conflictState
   -> ConflictResolutionDialog appears

7. User resolves conflict
   -> onReload: dispatch(resolveConflictWithReload(serverData))
   -> onForceSave: dispatch(forceSaveTransactionEdit({...}))
```

---

## 9. Code Structure Outline

### 9.1 New Files to Create

```
treasurer/src/
├── components/
│   └── transactions/
│       └── edit/
│           ├── index.ts                      # Public exports
│           ├── TransactionEditModal.tsx      # Main modal container
│           ├── TransactionEditForm.tsx       # Form component
│           ├── ConflictResolutionDialog.tsx  # 409 handling UI
│           ├── EditHistoryPanel.tsx          # Audit trail display
│           ├── EditHistoryTimeline.tsx       # Timeline visualization
│           ├── EditHistoryEntry.tsx          # Single history item
│           ├── QuickEditPopover.tsx          # Inline quick edits
│           ├── FormErrorAnnouncer.tsx        # A11y error announcements
│           ├── VersionIndicator.tsx          # Shows version/last modified
│           └── __tests__/
│               ├── TransactionEditModal.test.tsx
│               ├── TransactionEditForm.test.tsx
│               └── ConflictResolutionDialog.test.tsx
│
├── hooks/
│   ├── useTransactionEditForm.ts             # Form state management
│   ├── useTransactionFreshness.ts            # Stale data detection
│   └── useEditModalKeyboard.ts               # Keyboard shortcuts
│
├── lib/
│   └── validations/
│       └── transactionEdit.ts                # Zod validation schemas
│
└── types/
    └── transactionEdit.ts                    # Edit-specific types
```

### 9.2 Modified Files

```
treasurer/src/
├── store/
│   └── features/
│       └── transactionSlice.ts               # Add edit state, actions, selectors
│
├── lib/
│   └── api/
│       └── transactions.ts                   # Add getForEdit, getEditHistory
│
├── pages/
│   └── TransactionsPage.tsx                  # Add edit modal integration
│
├── components/
│   └── transactions/
│       ├── index.ts                          # Export edit components
│       └── TransactionCard.tsx               # Add edit button handler
│
└── types/
    └── index.ts                              # Add EditableTransaction type
```

### 9.3 Component Export Pattern

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/index.ts

export { TransactionEditModal } from './TransactionEditModal';
export { TransactionEditForm } from './TransactionEditForm';
export { ConflictResolutionDialog } from './ConflictResolutionDialog';
export { EditHistoryPanel } from './EditHistoryPanel';
export { QuickEditPopover } from './QuickEditPopover';

export type {
  TransactionEditModalProps,
  TransactionEditFormProps,
  TransactionEditFormData,
  TransactionEditErrors,
  ConflictResolutionDialogProps,
  EditHistoryPanelProps,
} from './types';
```

---

## 10. Testing Strategy

### 10.1 Component Tests

```typescript
// /home/don/dev/treasurer2026/treasurer/src/components/transactions/edit/__tests__/TransactionEditForm.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionEditForm } from '../TransactionEditForm';
import { TestProviders } from '@/test/utils';

describe('TransactionEditForm', () => {
  const mockInitialData: TransactionEditFormData = {
    description: 'Test transaction',
    amount: 100,
    transactionType: 'EXPENSE',
    date: '2024-01-15',
    vendorId: null,
    memo: null,
    splits: [{ amount: 100, categoryName: 'Office Supplies', categoryId: '123' }],
    applyFee: false,
    version: 1,
  };

  it('renders all form fields with initial data', () => {
    render(
      <TestProviders>
        <TransactionEditForm
          initialData={mockInitialData}
          isSubmitting={false}
          errors={{}}
          isReconciled={false}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByLabelText(/description/i)).toHaveValue('Test transaction');
    expect(screen.getByLabelText(/amount/i)).toHaveValue(100);
    expect(screen.getByLabelText(/date/i)).toHaveValue('2024-01-15');
  });

  it('calls onChange when field is modified', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TestProviders>
        <TransactionEditForm
          initialData={mockInitialData}
          isSubmitting={false}
          errors={{}}
          isReconciled={false}
          onChange={handleChange}
          onSubmit={vi.fn()}
        />
      </TestProviders>
    );

    await user.clear(screen.getByLabelText(/description/i));
    await user.type(screen.getByLabelText(/description/i), 'Updated description');

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Updated description' })
    );
  });

  it('displays validation errors', () => {
    render(
      <TestProviders>
        <TransactionEditForm
          initialData={mockInitialData}
          isSubmitting={false}
          errors={{ description: 'Description is required' }}
          isReconciled={false}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables all fields when reconciled', () => {
    render(
      <TestProviders>
        <TransactionEditForm
          initialData={mockInitialData}
          isSubmitting={false}
          errors={{}}
          isReconciled={true}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
        />
      </TestProviders>
    );

    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByLabelText(/amount/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});
```

### 10.2 Redux Integration Tests

```typescript
// /home/don/dev/treasurer2026/treasurer/src/store/features/__tests__/transactionSlice.edit.test.ts

import { configureStore } from '@reduxjs/toolkit';
import transactionReducer, {
  openEditModal,
  closeEditModal,
  updateEditFormData,
  saveTransactionEdit,
  selectIsEditModalOpen,
  selectEditFormData,
  selectHasConflict,
} from '../transactionSlice';

describe('transactionSlice - edit functionality', () => {
  const mockTransaction: EditableTransaction = {
    id: '1',
    description: 'Test',
    amount: '100.00',
    transactionType: 'EXPENSE',
    date: '2024-01-15T12:00:00Z',
    version: 1,
    splits: [],
    // ... other fields
  };

  it('opens edit modal and initializes form data', () => {
    const store = configureStore({ reducer: { transaction: transactionReducer } });

    store.dispatch(openEditModal(mockTransaction));

    const state = store.getState();
    expect(selectIsEditModalOpen(state)).toBe(true);
    expect(selectEditFormData(state)).toEqual(
      expect.objectContaining({
        description: 'Test',
        amount: 100,
        version: 1,
      })
    );
  });

  it('updates form data and marks as dirty', () => {
    const store = configureStore({ reducer: { transaction: transactionReducer } });
    store.dispatch(openEditModal(mockTransaction));

    store.dispatch(updateEditFormData({ description: 'Updated' }));

    const state = store.getState();
    expect(selectEditFormData(state)?.description).toBe('Updated');
    expect(state.transaction.editState.isDirty).toBe(true);
  });

  it('handles 409 conflict error', async () => {
    // Mock API to return 409
    vi.spyOn(transactionApi, 'update').mockRejectedValueOnce(
      new ApiError(409, 'Version conflict')
    );
    vi.spyOn(transactionApi, 'get').mockResolvedValueOnce({
      data: { transaction: { ...mockTransaction, version: 2 } },
    });

    const store = configureStore({ reducer: { transaction: transactionReducer } });
    store.dispatch(openEditModal(mockTransaction));

    await store.dispatch(saveTransactionEdit({
      orgId: 'org1',
      accountId: 'acc1',
      transactionId: '1',
      data: { description: 'Updated' },
      version: 1,
    }));

    expect(selectHasConflict(store.getState())).toBe(true);
  });
});
```

---

## 11. Implementation Priority

### Phase 1: Core Edit Functionality (MVP)
1. TransactionEditModal component
2. TransactionEditForm with all fields
3. Redux slice updates for edit state
4. API integration with version support
5. Basic validation

### Phase 2: Conflict Resolution
1. 409 error detection
2. ConflictResolutionDialog component
3. Reload and force save flows
4. User notifications

### Phase 3: Edit History
1. EditHistoryPanel component
2. History fetch and display
3. Timeline visualization

### Phase 4: Polish
1. QuickEditPopover for inline edits
2. Freshness detection
3. Full accessibility audit
4. Mobile optimization
5. Performance optimization (memoization)

---

## 12. Summary

This architecture provides:

- **Modal-based editing** preserving context and enabling quick edits
- **Redux-managed form state** with comprehensive conflict handling
- **URL-based edit mode** for deep linking and history support
- **Optimistic locking** with user-friendly conflict resolution
- **Full accessibility** compliance including keyboard navigation and screen reader support
- **Responsive design** with mobile-first full-screen modal approach
- **Comprehensive error handling** for validation, network, and conflict scenarios
- **Edit history** integration for audit trail visibility

The design aligns with existing patterns in the codebase (status history modal, transaction form, Redux slices) while introducing the necessary new functionality for transaction editing with conflict resolution.
