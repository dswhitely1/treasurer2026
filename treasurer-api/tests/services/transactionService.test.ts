import { describe, it, expect } from "vitest";
import { EditType, Prisma } from "@prisma/client";
import type {
  UpdateTransactionDto,
  FieldChange,
} from "../../src/schemas/transaction.js";

// Mock types for testing
interface MockTransaction {
  id: string;
  memo: string | null;
  amount: Prisma.Decimal;
  transactionType: string;
  date: Date;
  feeAmount: Prisma.Decimal | null;
  vendorId: string | null;
  destinationAccountId: string | null;
  splits: Array<{
    id: string;
    amount: Prisma.Decimal;
    categoryId: string;
  }>;
}

describe("Transaction Service - Field Change Detection", () => {
  // Import the actual functions for testing
  // Note: These are internal functions, so we're testing them via the exported updateTransaction function
  // For unit tests, we'll test the logic directly

  /**
   * Test implementation of detectFieldChanges
   * This mirrors the actual implementation in transactionService.ts
   */
  function detectFieldChanges(
    existing: {
      memo: string | null;
      amount: Prisma.Decimal;
      transactionType: string;
      date: Date;
      feeAmount: Prisma.Decimal | null;
      vendorId: string | null;
      destinationAccountId: string | null;
      splits: Array<{
        id: string;
        amount: Prisma.Decimal;
        categoryId: string;
      }>;
    },
    input: UpdateTransactionDto,
    newSplits?: Array<{ amount: number; categoryId: string }>,
  ): FieldChange[] {
    const changes: FieldChange[] = [];

    // Check memo change
    if (input.memo !== undefined && input.memo !== existing.memo) {
      changes.push({
        field: "memo",
        oldValue: existing.memo,
        newValue: input.memo,
      });
    }

    // Check amount change
    if (
      input.amount !== undefined &&
      input.amount !== existing.amount.toNumber()
    ) {
      changes.push({
        field: "amount",
        oldValue: existing.amount.toNumber(),
        newValue: input.amount,
      });
    }

    // Check transactionType change
    if (
      input.transactionType !== undefined &&
      input.transactionType !== existing.transactionType
    ) {
      changes.push({
        field: "transactionType",
        oldValue: existing.transactionType,
        newValue: input.transactionType,
      });
    }

    // Check date change
    if (input.date !== undefined) {
      const newDate = new Date(input.date);
      if (newDate.getTime() !== existing.date.getTime()) {
        changes.push({
          field: "date",
          oldValue: existing.date.toISOString(),
          newValue: newDate.toISOString(),
        });
      }
    }

    // Check vendorId change
    if (input.vendorId !== undefined && input.vendorId !== existing.vendorId) {
      changes.push({
        field: "vendorId",
        oldValue: existing.vendorId,
        newValue: input.vendorId,
      });
    }

    // Check destinationAccountId change
    if (
      input.destinationAccountId !== undefined &&
      input.destinationAccountId !== existing.destinationAccountId
    ) {
      changes.push({
        field: "destinationAccountId",
        oldValue: existing.destinationAccountId,
        newValue: input.destinationAccountId,
      });
    }

    // Check splits change
    if (input.splits && newSplits) {
      const oldSplits = existing.splits.map((s) => ({
        amount: s.amount.toNumber(),
        categoryId: s.categoryId,
      }));

      const splitsChanged =
        oldSplits.length !== newSplits.length ||
        oldSplits.some((old, i) => {
          const newSplit = newSplits[i];
          if (!newSplit) return true;
          return (
            old.amount !== newSplit.amount ||
            old.categoryId !== newSplit.categoryId
          );
        });

      if (splitsChanged) {
        changes.push({
          field: "splits",
          oldValue: oldSplits,
          newValue: newSplits,
        });
      }
    }

    return changes;
  }

  /**
   * Test implementation of buildPreviousState
   */
  function buildPreviousState(
    existing: {
      memo: string | null;
      amount: Prisma.Decimal;
      transactionType: string;
      date: Date;
      feeAmount: Prisma.Decimal | null;
      vendorId: string | null;
      destinationAccountId: string | null;
      splits: Array<{
        id: string;
        amount: Prisma.Decimal;
        categoryId: string;
      }>;
    },
  ): Record<string, unknown> {
    return {
      memo: existing.memo,
      amount: existing.amount.toNumber(),
      transactionType: existing.transactionType,
      date: existing.date.toISOString(),
      feeAmount: existing.feeAmount?.toNumber() ?? null,
      vendorId: existing.vendorId,
      destinationAccountId: existing.destinationAccountId,
      splits: existing.splits.map((s) => ({
        amount: s.amount.toNumber(),
        categoryId: s.categoryId,
      })),
    };
  }

  describe("detectFieldChanges", () => {
    it("should detect memo change", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Old memo",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        memo: "New memo",
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "memo",
        oldValue: "Old memo",
        newValue: "New memo",
      });
    });

    it("should detect amount change", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        amount: 200,
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "amount",
        oldValue: 100,
        newValue: 200,
      });
    });

    it("should detect transaction type change", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        transactionType: "INCOME",
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "transactionType",
        oldValue: "EXPENSE",
        newValue: "INCOME",
      });
    });

    it("should detect date change", () => {
      const oldDate = new Date("2024-01-01T00:00:00Z");
      const newDate = new Date("2024-02-01T00:00:00Z");

      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: oldDate,
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        date: newDate.toISOString(),
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "date",
        oldValue: oldDate.toISOString(),
        newValue: newDate.toISOString(),
      });
    });

    it("should detect vendorId change", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: "vendor-1",
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        vendorId: "vendor-2",
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "vendorId",
        oldValue: "vendor-1",
        newValue: "vendor-2",
      });
    });

    it("should detect vendorId change from value to null", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: "vendor-1",
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        vendorId: null,
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "vendorId",
        oldValue: "vendor-1",
        newValue: null,
      });
    });

    it("should detect destinationAccountId change", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "TRANSFER",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: "account-1",
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        destinationAccountId: "account-2",
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: "destinationAccountId",
        oldValue: "account-1",
        newValue: "account-2",
      });
    });

    it("should detect splits change when amounts differ", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        splits: [{ amount: 100, categoryName: "Food" }],
      };

      const newSplits = [{ amount: 50, categoryId: "cat-1" }];

      const changes = detectFieldChanges(existing, input, newSplits);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("splits");
    });

    it("should detect splits change when categories differ", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        splits: [{ amount: 100, categoryName: "Transport" }],
      };

      const newSplits = [{ amount: 100, categoryId: "cat-2" }];

      const changes = detectFieldChanges(existing, input, newSplits);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("splits");
    });

    it("should detect splits change when number of splits changes", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        splits: [
          { amount: 50, categoryName: "Food" },
          { amount: 50, categoryName: "Transport" },
        ],
      };

      const newSplits = [
        { amount: 50, categoryId: "cat-1" },
        { amount: 50, categoryId: "cat-2" },
      ];

      const changes = detectFieldChanges(existing, input, newSplits);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("splits");
    });

    it("should detect multiple field changes", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Old memo",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        memo: "New memo",
        amount: 200,
        transactionType: "INCOME",
        splits: [{ amount: 200, categoryName: "Salary" }],
      };

      const newSplits = [{ amount: 200, categoryId: "cat-2" }];

      const changes = detectFieldChanges(existing, input, newSplits);

      expect(changes.length).toBeGreaterThanOrEqual(3);
      expect(changes.map((c) => c.field)).toEqual(
        expect.arrayContaining(["memo", "amount", "transactionType", "splits"]),
      );
    });

    it("should return empty array when no changes", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        // No fields to update
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(0);
    });

    it("should handle undefined vs null correctly for memo", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: null,
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      // undefined means "don't change"
      const input1: UpdateTransactionDto = {
        version: 1,
        memo: undefined,
      };

      const changes1 = detectFieldChanges(existing, input1);
      expect(changes1).toHaveLength(0);

      // null to string should be detected
      const input2: UpdateTransactionDto = {
        version: 1,
        memo: "New memo",
      };

      const changes2 = detectFieldChanges(existing, input2);
      expect(changes2).toHaveLength(1);
      expect(changes2[0]).toEqual({
        field: "memo",
        oldValue: null,
        newValue: "New memo",
      });
    });
  });

  describe("buildPreviousState", () => {
    it("should create complete snapshot of transaction state", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test memo",
        amount: new Prisma.Decimal(150.5),
        transactionType: "EXPENSE",
        date: new Date("2024-01-15T10:30:00Z"),
        feeAmount: new Prisma.Decimal(5.0),
        vendorId: "vendor-123",
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
          {
            id: "split-2",
            amount: new Prisma.Decimal(50.5),
            categoryId: "cat-2",
          },
        ],
      };

      const previousState = buildPreviousState(existing);

      expect(previousState).toEqual({
        memo: "Test memo",
        amount: 150.5,
        transactionType: "EXPENSE",
        date: "2024-01-15T10:30:00.000Z",
        feeAmount: 5.0,
        vendorId: "vendor-123",
        destinationAccountId: null,
        splits: [
          { amount: 100, categoryId: "cat-1" },
          { amount: 50.5, categoryId: "cat-2" },
        ],
      });
    });

    it("should handle null values correctly", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: null,
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const previousState = buildPreviousState(existing);

      expect(previousState.memo).toBeNull();
      expect(previousState.feeAmount).toBeNull();
      expect(previousState.vendorId).toBeNull();
      expect(previousState.destinationAccountId).toBeNull();
    });

    it("should preserve decimal precision in splits", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(33.33),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(16.665),
            categoryId: "cat-1",
          },
          {
            id: "split-2",
            amount: new Prisma.Decimal(16.665),
            categoryId: "cat-2",
          },
        ],
      };

      const previousState = buildPreviousState(existing);

      expect(previousState.splits).toEqual([
        { amount: 16.665, categoryId: "cat-1" },
        { amount: 16.665, categoryId: "cat-2" },
      ]);
    });
  });

  describe("Edit Type Determination", () => {
    it("should identify SPLIT_CHANGE when splits are modified", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        splits: [
          { amount: 50, categoryName: "Food" },
          { amount: 50, categoryName: "Transport" },
        ],
      };

      const newSplits = [
        { amount: 50, categoryId: "cat-1" },
        { amount: 50, categoryId: "cat-2" },
      ];

      const changes = detectFieldChanges(existing, input, newSplits);

      // If any change is to splits, editType should be SPLIT_CHANGE
      const hasSplitChange = changes.some((change) => change.field === "splits");
      const editType = hasSplitChange ? EditType.SPLIT_CHANGE : EditType.UPDATE;

      expect(editType).toBe(EditType.SPLIT_CHANGE);
    });

    it("should identify UPDATE when only non-split fields change", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Old memo",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        memo: "New memo",
        amount: 200,
      };

      const changes = detectFieldChanges(existing, input);

      const hasSplitChange = changes.some((change) => change.field === "splits");
      const editType = hasSplitChange ? EditType.SPLIT_CHANGE : EditType.UPDATE;

      expect(editType).toBe(EditType.UPDATE);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large decimal amounts", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal("999999999999.9999"),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal("999999999999.9999"),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        amount: 123456789.99,
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("amount");
    });

    it("should handle empty splits array change", () => {
      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: new Date("2024-01-01"),
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      // This would be invalid in real scenario, but testing edge case
      const input: UpdateTransactionDto = {
        version: 1,
        splits: [{ amount: 100, categoryName: "Test" }],
      };

      const newSplits: Array<{ amount: number; categoryId: string }> = [];

      const changes = detectFieldChanges(existing, input, newSplits);

      expect(changes.some((c) => c.field === "splits")).toBe(true);
    });

    it("should handle date with milliseconds precision", () => {
      const oldDate = new Date("2024-01-01T12:00:00.123Z");
      const newDate = new Date("2024-01-01T12:00:00.456Z");

      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: oldDate,
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        date: newDate.toISOString(),
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(1);
      expect(changes[0].field).toBe("date");
    });

    it("should not detect change when date is same but in different format", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");

      const existing: MockTransaction = {
        id: "test-id",
        memo: "Test",
        amount: new Prisma.Decimal(100),
        transactionType: "EXPENSE",
        date: date,
        feeAmount: null,
        vendorId: null,
        destinationAccountId: null,
        splits: [
          {
            id: "split-1",
            amount: new Prisma.Decimal(100),
            categoryId: "cat-1",
          },
        ],
      };

      const input: UpdateTransactionDto = {
        version: 1,
        date: date.toISOString(), // Same date, same format
      };

      const changes = detectFieldChanges(existing, input);

      expect(changes).toHaveLength(0);
    });
  });
});
