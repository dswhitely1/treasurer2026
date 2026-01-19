import { EditType, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import type { FieldChange } from "../schemas/transaction.js";

/**
 * Represents a single edit history entry with user information
 */
export interface TransactionEditHistoryInfo {
  id: string;
  transactionId: string;
  editedById: string;
  editedByName: string | null;
  editedByEmail: string;
  editedAt: string;
  editType: EditType;
  changes: FieldChange[];
  previousState: Record<string, unknown> | null;
}

/**
 * Retrieves the complete edit history for a transaction
 * @param organizationId - The organization ID for authorization
 * @param accountId - The account ID the transaction belongs to
 * @param transactionId - The transaction ID to get history for
 * @returns Array of edit history entries sorted by most recent first
 */
export async function getTransactionEditHistory(
  organizationId: string,
  accountId: string,
  transactionId: string,
): Promise<TransactionEditHistoryInfo[]> {
  // Verify account exists and belongs to org
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  });

  if (!account) {
    throw new AppError("Account not found", 404);
  }

  // Verify transaction exists and belongs to account
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  // Fetch edit history with user information
  const history = await prisma.transactionEditHistory.findMany({
    where: { transactionId },
    include: {
      editedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { editedAt: "desc" },
  });

  return history.map((entry) => ({
    id: entry.id,
    transactionId: entry.transactionId,
    editedById: entry.editedById,
    editedByName: entry.editedBy.name,
    editedByEmail: entry.editedBy.email,
    editedAt: entry.editedAt.toISOString(),
    editType: entry.editType,
    changes: entry.changes as unknown as FieldChange[],
    previousState: entry.previousState as unknown as Record<string, unknown> | null,
  }));
}

/**
 * Creates an edit history entry for a transaction
 * Used primarily for CREATE and DELETE operations
 * @param transactionId - The transaction ID
 * @param userId - The user performing the action
 * @param editType - The type of edit (CREATE, DELETE, RESTORE, etc.)
 * @param changes - Array of field changes
 * @param previousState - Optional previous state snapshot
 */
export async function createEditHistoryEntry(
  transactionId: string,
  userId: string,
  editType: EditType,
  changes: FieldChange[],
  previousState?: Record<string, unknown>,
): Promise<void> {
  await prisma.transactionEditHistory.create({
    data: {
      transactionId,
      editedById: userId,
      editType,
      changes: changes as unknown as Prisma.InputJsonValue,
      previousState: previousState
        ? (previousState as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}

/**
 * Gets the most recent edit for a transaction
 * Useful for displaying "last modified by" information
 * @param transactionId - The transaction ID
 * @returns The most recent edit history entry or null
 */
export async function getLatestEditHistoryEntry(
  transactionId: string,
): Promise<TransactionEditHistoryInfo | null> {
  const entry = await prisma.transactionEditHistory.findFirst({
    where: { transactionId },
    include: {
      editedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { editedAt: "desc" },
  });

  if (!entry) {
    return null;
  }

  return {
    id: entry.id,
    transactionId: entry.transactionId,
    editedById: entry.editedById,
    editedByName: entry.editedBy.name,
    editedByEmail: entry.editedBy.email,
    editedAt: entry.editedAt.toISOString(),
    editType: entry.editType,
    changes: entry.changes as unknown as FieldChange[],
    previousState: entry.previousState as unknown as Record<string, unknown> | null,
  };
}

/**
 * Gets edit history count for a transaction
 * Useful for displaying edit count in UI
 * @param transactionId - The transaction ID
 * @returns Number of edits made to the transaction
 */
export async function getEditHistoryCount(
  transactionId: string,
): Promise<number> {
  return prisma.transactionEditHistory.count({
    where: { transactionId },
  });
}
