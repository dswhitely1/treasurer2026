import { EditType, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { ERROR_IDS } from "../constants/errorIds.js";
import { validateVendorOwnership } from "./vendorService.js";
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionType,
  TransactionQueryDto,
  FieldChange,
  ConflictMetadata,
} from "../schemas/transaction.js";

export interface TransactionSplitInfo {
  id: string;
  amount: string;
  categoryId: string;
  categoryName: string;
}

export interface TransactionInfo {
  id: string;
  description: string | null;
  memo: string | null;
  amount: string;
  transactionType: TransactionType;
  date: string;
  feeAmount: string | null;
  vendorId: string | null;
  vendorName: string | null;
  accountId: string;
  destinationAccountId: string | null;
  status: string;
  clearedAt: string | null;
  reconciledAt: string | null;
  version: number;
  createdById: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  lastModifiedById: string | null;
  lastModifiedByName: string | null;
  lastModifiedByEmail: string | null;
  splits: TransactionSplitInfo[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Result type for update operations that may include conflict metadata
 */
export interface UpdateTransactionResult {
  transaction: TransactionInfo;
}

/**
 * Custom error class for version conflicts with metadata
 */
export class VersionConflictError extends AppError {
  public conflictMetadata: ConflictMetadata;
  public currentTransaction: TransactionInfo;

  constructor(
    message: string,
    conflictMetadata: ConflictMetadata,
    currentTransaction: TransactionInfo,
  ) {
    super(message, 409, undefined, ERROR_IDS.TXN_VERSION_CONFLICT);
    this.name = "VersionConflictError";
    this.conflictMetadata = conflictMetadata;
    this.currentTransaction = currentTransaction;
  }
}

interface TransactionWithSplits {
  id: string;
  memo: string | null;
  amount: Prisma.Decimal;
  transactionType: string;
  date: Date;
  feeAmount: Prisma.Decimal | null;
  vendorId: string | null;
  accountId: string;
  destinationAccountId: string | null;
  status: string;
  clearedAt: Date | null;
  reconciledAt: Date | null;
  version: number;
  createdById: string | null;
  lastModifiedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  vendor?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  lastModifiedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  splits: Array<{
    id: string;
    amount: Prisma.Decimal;
    categoryId: string;
    category: {
      id: string;
      name: string;
    };
  }>;
}

function formatTransaction(
  transaction: TransactionWithSplits,
): TransactionInfo {
  return {
    id: transaction.id,
    description: transaction.memo,
    memo: transaction.memo,
    amount: transaction.amount.toString(),
    transactionType: transaction.transactionType as TransactionType,
    date: transaction.date.toISOString(),
    feeAmount: transaction.feeAmount?.toString() ?? null,
    vendorId: transaction.vendorId,
    vendorName: transaction.vendor?.name ?? null,
    accountId: transaction.accountId,
    destinationAccountId: transaction.destinationAccountId,
    status: transaction.status,
    clearedAt: transaction.clearedAt?.toISOString() ?? null,
    reconciledAt: transaction.reconciledAt?.toISOString() ?? null,
    version: transaction.version,
    createdById: transaction.createdById,
    createdByName: transaction.createdBy?.name ?? null,
    createdByEmail: transaction.createdBy?.email ?? null,
    lastModifiedById: transaction.lastModifiedById,
    lastModifiedByName: transaction.lastModifiedBy?.name ?? null,
    lastModifiedByEmail: transaction.lastModifiedBy?.email ?? null,
    splits: transaction.splits.map((split) => ({
      id: split.id,
      amount: split.amount.toString(),
      categoryId: split.categoryId,
      categoryName: split.category.name,
    })),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

/**
 * Detects field changes between old and new transaction data
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
 * Builds a snapshot of the previous transaction state for audit
 */
function buildPreviousState(existing: {
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
}): Record<string, unknown> {
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

async function getOrCreateCategory(
  organizationId: string,
  categoryName: string,
): Promise<string> {
  const normalizedName = categoryName.trim();

  // Find category by name (case-insensitive) at root level (parentId = null)
  const existing = await prisma.category.findFirst({
    where: {
      organizationId,
      name: {
        equals: normalizedName,
        mode: "insensitive",
      },
      parentId: null,
    },
  });

  if (existing) {
    return existing.id;
  }

  const category = await prisma.category.create({
    data: {
      name: normalizedName,
      organizationId,
      depth: 0,
      parentId: null,
    },
  });

  return category.id;
}

export async function createTransaction(
  organizationId: string,
  accountId: string,
  input: CreateTransactionDto,
  userId?: string,
): Promise<TransactionInfo> {
  // Verify source account exists and belongs to org
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  });

  if (!account) {
    throw new AppError(
      "Account not found",
      404,
      undefined,
      ERROR_IDS.TXN_ACCOUNT_NOT_FOUND,
    );
  }

  // Validate vendor if provided
  if (input.vendorId) {
    const isValid = await validateVendorOwnership(
      input.vendorId,
      organizationId,
    );
    if (!isValid) {
      throw new AppError(
        "Vendor not found or inactive",
        404,
        undefined,
        ERROR_IDS.TXN_VENDOR_NOT_FOUND,
      );
    }
  }

  // For TRANSFER transactions, validate destination account
  let destinationAccount = null;
  if (input.transactionType === "TRANSFER") {
    if (!input.destinationAccountId) {
      throw new AppError(
        "Destination account is required for transfers",
        400,
        undefined,
        ERROR_IDS.TXN_DESTINATION_REQUIRED,
      );
    }

    if (input.destinationAccountId === accountId) {
      throw new AppError(
        "Source and destination accounts must be different",
        400,
        undefined,
        ERROR_IDS.TXN_DESTINATION_SAME_AS_SOURCE,
      );
    }

    destinationAccount = await prisma.account.findFirst({
      where: {
        id: input.destinationAccountId,
        organizationId,
      },
    });

    if (!destinationAccount) {
      throw new AppError(
        "Destination account not found",
        404,
        undefined,
        ERROR_IDS.TXN_DESTINATION_NOT_FOUND,
      );
    }
  }

  // Calculate fee if applicable (fees apply to source account)
  let feeAmount: number | null = null;
  if (input.applyFee && account.transactionFee) {
    feeAmount = account.transactionFee.toNumber();
  }

  // Get or create categories
  const categoryIds = await Promise.all(
    input.splits.map(async (split) => {
      // If categoryId is provided, use it (hierarchical category selected)
      if (split.categoryId) {
        // Verify the category exists and belongs to the organization
        const category = await prisma.category.findFirst({
          where: {
            id: split.categoryId,
            organizationId,
          },
        });

        if (!category) {
          throw new AppError(
            `Category ${split.categoryName} not found`,
            404,
            undefined,
            ERROR_IDS.TXN_CATEGORY_NOT_FOUND,
          );
        }

        return split.categoryId;
      }

      // Otherwise, get or create by name (legacy/manual entry)
      return getOrCreateCategory(organizationId, split.categoryName);
    }),
  );

  // Log transaction creation start
  console.log("[DB] Creating transaction", {
    operation: "createTransaction",
    organizationId,
    accountId,
    type: input.transactionType,
    amount: input.amount,
    splits: input.splits.length,
    hasVendor: !!input.vendorId,
    timestamp: new Date().toISOString(),
  });

  // Create transaction with splits in a transaction
  const transaction = await prisma.$transaction(async (tx) => {
    const newTransaction = await tx.transaction.create({
      data: {
        memo: input.memo,
        amount: input.amount,
        transactionType: input.transactionType,
        date: input.date ? new Date(input.date) : new Date(),
        feeAmount,
        ...(input.vendorId && {
          vendor: {
            connect: { id: input.vendorId },
          },
        }),
        account: {
          connect: { id: accountId },
        },
        ...(input.destinationAccountId && {
          destinationAccount: {
            connect: { id: input.destinationAccountId },
          },
        }),
        ...(userId && {
          createdBy: {
            connect: { id: userId },
          },
        }),
        splits: {
          create: input.splits.map((split, index) => ({
            amount: split.amount,
            category: {
              connect: { id: categoryIds[index] },
            },
          })),
        },
      },
      include: {
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        lastModifiedBy: {
          select: { id: true, name: true, email: true },
        },
        splits: {
          include: {
            category: true,
          },
        },
      },
    });

    // Update account balances based on transaction type
    if (input.transactionType === "TRANSFER") {
      // TRANSFER: subtract from source, add to destination
      const sourceDeduction = input.amount + (feeAmount ?? 0);

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: sourceDeduction,
          },
        },
      });

      // For TRANSFER transactions, destinationAccountId is validated by the runtime check above (line 464)
      // Safe to assert non-null here
      await tx.account.update({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        where: { id: input.destinationAccountId! },
        data: {
          balance: {
            increment: input.amount,
          },
        },
      });
    } else {
      // INCOME or EXPENSE
      const totalAmount =
        input.transactionType === "INCOME" ? input.amount : -input.amount;
      const totalWithFee = feeAmount ? totalAmount - feeAmount : totalAmount;

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: totalWithFee,
          },
        },
      });
    }

    return newTransaction;
  });

  // Log successful transaction creation
  console.log("[DB] Transaction created successfully", {
    operation: "createTransaction",
    transactionId: transaction.id,
    organizationId,
    accountId,
    type: transaction.transactionType,
    amount: transaction.amount.toString(),
    timestamp: new Date().toISOString(),
  });

  return formatTransaction(transaction);
}

export async function getAccountTransactions(
  organizationId: string,
  accountId: string,
  query: TransactionQueryDto,
): Promise<{ transactions: TransactionInfo[]; total: number }> {
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

  // Build where clause
  const where: Prisma.TransactionWhereInput = {
    accountId,
    ...(query.startDate && { date: { gte: new Date(query.startDate) } }),
    ...(query.endDate && { date: { lte: new Date(query.endDate) } }),
    ...(query.type && { transactionType: query.type }),
    ...(query.vendorId && { vendorId: query.vendorId }),
    ...(query.category && {
      splits: {
        some: {
          category: {
            name: { contains: query.category, mode: "insensitive" },
          },
        },
      },
    }),
  };

  // Add status filtering
  if (query.status) {
    where.status = query.status;
  } else if (query.statuses && query.statuses.length > 0) {
    where.status = { in: query.statuses };
  }

  // Add clearedAt date range filtering
  if (query.clearedAfter || query.clearedBefore) {
    where.clearedAt = {
      ...(query.clearedAfter && { gte: new Date(query.clearedAfter) }),
      ...(query.clearedBefore && { lte: new Date(query.clearedBefore) }),
    };
  }

  // Add reconciledAt date range filtering
  if (query.reconciledAfter || query.reconciledBefore) {
    where.reconciledAt = {
      ...(query.reconciledAfter && { gte: new Date(query.reconciledAfter) }),
      ...(query.reconciledBefore && { lte: new Date(query.reconciledBefore) }),
    };
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        lastModifiedBy: {
          select: { id: true, name: true, email: true },
        },
        splits: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions: transactions.map(formatTransaction),
    total,
  };
}

/**
 * Get a single transaction by ID.
 *
 * NOTE: This function returns version info for optimistic locking. The frontend has a
 * separate `getForEdit` method that calls the same endpoint but makes the version
 * requirement explicit through type annotations. All GET requests return version data.
 */
export async function getTransaction(
  organizationId: string,
  accountId: string,
  transactionId: string,
): Promise<TransactionInfo> {
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

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
    include: {
      vendor: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      lastModifiedBy: {
        select: { id: true, name: true, email: true },
      },
      splits: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!transaction) {
    throw new AppError("Transaction not found", 404);
  }

  return formatTransaction(transaction);
}

export async function updateTransaction(
  organizationId: string,
  accountId: string,
  transactionId: string,
  input: UpdateTransactionDto,
  userId: string,
): Promise<TransactionInfo> {
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

  // Fetch existing transaction with user relations for conflict detection
  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
    include: {
      splits: {
        include: {
          category: true,
        },
      },
      vendor: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      lastModifiedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!existing) {
    throw new AppError("Transaction not found", 404);
  }

  // Optimistic locking check - version must match (unless force=true)
  if (!input.force && existing.version !== input.version) {
    // Log version conflict detection
    console.error("[DB] Version conflict detected", {
      operation: "updateTransaction",
      transactionId,
      expectedVersion: input.version,
      currentVersion: existing.version,
      userId,
      lastModifiedBy: existing.lastModifiedById,
      timestamp: new Date().toISOString(),
    });

    // Fetch the current transaction formatted for the response
    const currentFormatted = formatTransaction(existing);

    const conflictMetadata: ConflictMetadata = {
      currentVersion: existing.version,
      lastModifiedById: existing.lastModifiedById,
      lastModifiedByName: existing.lastModifiedBy?.name ?? null,
      lastModifiedByEmail: existing.lastModifiedBy?.email ?? null,
      lastModifiedAt: existing.updatedAt.toISOString(),
    };

    throw new VersionConflictError(
      "Transaction has been modified by another user. Please refresh and try again.",
      conflictMetadata,
      currentFormatted,
    );
  }

  // Validate vendor if provided
  if (input.vendorId !== undefined && input.vendorId !== null) {
    const isValid = await validateVendorOwnership(
      input.vendorId,
      organizationId,
    );
    if (!isValid) {
      throw new AppError("Vendor not found or inactive", 404);
    }
  }

  // Determine old and new transaction types
  const oldType = existing.transactionType;
  const newType = input.transactionType ?? oldType;
  const oldAmount = existing.amount.toNumber();
  const newAmount = input.amount ?? oldAmount;
  const oldFee = existing.feeAmount?.toNumber() ?? 0;

  // Calculate new fee
  let newFeeAmount: number | null = existing.feeAmount?.toNumber() ?? null;
  if (input.applyFee !== undefined) {
    if (input.applyFee && account.transactionFee) {
      newFeeAmount = account.transactionFee.toNumber();
    } else if (!input.applyFee) {
      newFeeAmount = null;
    }
  }
  const newFee = newFeeAmount ?? 0;

  // Determine destination account changes
  const oldDestinationId = existing.destinationAccountId;
  // Use undefined to mean "no change", null to mean "remove", string to mean "set"
  const newDestinationId =
    input.destinationAccountId === undefined
      ? oldDestinationId
      : input.destinationAccountId;

  // Validate TRANSFER requirements
  if (newType === "TRANSFER") {
    if (!newDestinationId) {
      throw new AppError("Destination account is required for transfers", 400);
    }
    if (newDestinationId === accountId) {
      throw new AppError(
        "Source and destination accounts must be different",
        400,
      );
    }
    // Verify destination account exists and belongs to org
    const destAccount = await prisma.account.findFirst({
      where: {
        id: newDestinationId,
        organizationId,
      },
    });
    if (!destAccount) {
      throw new AppError("Destination account not found", 404);
    }
  } else if (newDestinationId) {
    throw new AppError(
      "Destination account should only be provided for transfer transactions",
      400,
    );
  }

  // Prepare splits update if provided
  let categoryIds: string[] = [];
  if (input.splits) {
    categoryIds = await Promise.all(
      input.splits.map(async (split) => {
        // If categoryId is provided, use it (hierarchical category selected)
        if (split.categoryId) {
          // Verify the category exists and belongs to the organization
          const category = await prisma.category.findFirst({
            where: {
              id: split.categoryId,
              organizationId,
            },
          });

          if (!category) {
            throw new AppError(`Category ${split.categoryName} not found`, 404);
          }

          return split.categoryId;
        }

        // Otherwise, get or create by name (legacy/manual entry)
        return getOrCreateCategory(organizationId, split.categoryName);
      }),
    );
  }

  // Build new splits data for change detection
  // Note: categoryIds is guaranteed to have the same length as input.splits
  const newSplitsData = input.splits
    ? input.splits.map((split, index) => ({
        amount: split.amount,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        categoryId: categoryIds[index]!,
      }))
    : undefined;

  // Detect field changes for audit trail
  const fieldChanges = detectFieldChanges(existing, input, newSplitsData);
  const previousState = buildPreviousState(existing);

  // Determine edit type based on what changed
  let editType: EditType = EditType.UPDATE;
  if (fieldChanges.some((change) => change.field === "splits")) {
    editType = EditType.SPLIT_CHANGE;
  }

  // Log transaction update start
  console.log("[DB] Updating transaction", {
    operation: "updateTransaction",
    transactionId,
    organizationId,
    accountId,
    userId,
    version: input.version,
    force: input.force ?? false,
    fieldsChanged: fieldChanges.length,
    editType,
    timestamp: new Date().toISOString(),
  });

  const transaction = await prisma.$transaction(async (tx) => {
    // Delete old splits if updating
    if (input.splits) {
      await tx.transactionSplit.deleteMany({
        where: { transactionId },
      });
    }

    // Build update data with version increment and lastModifiedById
    const updateData: Prisma.TransactionUpdateInput = {
      ...(input.memo !== undefined && {
        memo: input.memo,
      }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.transactionType !== undefined && {
        transactionType: input.transactionType,
      }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
      feeAmount: newFeeAmount,
      version: { increment: 1 },
      lastModifiedBy: { connect: { id: userId } },
    };

    // Handle vendor update
    if (input.vendorId !== undefined) {
      if (input.vendorId === null) {
        updateData.vendor = { disconnect: true };
      } else {
        updateData.vendor = { connect: { id: input.vendorId } };
      }
    }

    // Handle destination account update
    if (input.destinationAccountId !== undefined) {
      if (input.destinationAccountId === null) {
        updateData.destinationAccount = { disconnect: true };
      } else {
        updateData.destinationAccount = {
          connect: { id: input.destinationAccountId },
        };
      }
    }

    // Add splits if provided
    if (input.splits) {
      updateData.splits = {
        create: input.splits.map((split, index) => ({
          amount: split.amount,
          category: {
            connect: { id: categoryIds[index] },
          },
        })),
      };
    }

    // Update transaction
    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        vendor: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        lastModifiedBy: {
          select: { id: true, name: true, email: true },
        },
        splits: {
          include: {
            category: true,
          },
        },
      },
    });

    // Create edit history record if there are actual changes
    if (fieldChanges.length > 0) {
      await tx.transactionEditHistory.create({
        data: {
          transactionId,
          editedById: userId,
          editType,
          changes: fieldChanges as unknown as Prisma.InputJsonValue,
          previousState: previousState as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // Handle balance adjustments based on old and new transaction types
    const wasTransfer = oldType === "TRANSFER";
    const isTransfer = newType === "TRANSFER";

    if (wasTransfer && isTransfer) {
      // TRANSFER -> TRANSFER: Handle changes to amount, fee, or destination
      const oldSourceDeduction = oldAmount + oldFee;
      const newSourceDeduction = newAmount + newFee;

      // Adjust source account
      const sourceAdjustment = oldSourceDeduction - newSourceDeduction;
      if (sourceAdjustment !== 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: sourceAdjustment } },
        });
      }

      // Handle destination changes
      if (oldDestinationId !== newDestinationId) {
        // Remove amount from old destination
        if (oldDestinationId) {
          await tx.account.update({
            where: { id: oldDestinationId },
            data: { balance: { decrement: oldAmount } },
          });
        }
        // Add amount to new destination
        if (newDestinationId) {
          await tx.account.update({
            where: { id: newDestinationId },
            data: { balance: { increment: newAmount } },
          });
        }
      } else if (oldAmount !== newAmount && newDestinationId) {
        // Same destination, different amount
        const destAdjustment = newAmount - oldAmount;
        await tx.account.update({
          where: { id: newDestinationId },
          data: { balance: { increment: destAdjustment } },
        });
      }
    } else if (wasTransfer && !isTransfer) {
      // TRANSFER -> INCOME/EXPENSE: Reverse transfer, apply new type
      // Reverse old transfer: add back to source, subtract from destination
      const oldSourceDeduction = oldAmount + oldFee;
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: oldSourceDeduction } },
      });
      if (oldDestinationId) {
        await tx.account.update({
          where: { id: oldDestinationId },
          data: { balance: { decrement: oldAmount } },
        });
      }

      // Apply new INCOME/EXPENSE impact
      const newImpact =
        newType === "INCOME" ? newAmount - newFee : -(newAmount + newFee);
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: newImpact } },
      });
    } else if (!wasTransfer && isTransfer) {
      // INCOME/EXPENSE -> TRANSFER: Reverse old type, apply transfer
      // Reverse old INCOME/EXPENSE
      const oldImpact =
        oldType === "INCOME" ? oldAmount - oldFee : -(oldAmount + oldFee);
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: oldImpact } },
      });

      // Apply new TRANSFER
      const newSourceDeduction = newAmount + newFee;
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: newSourceDeduction } },
      });
      if (newDestinationId) {
        await tx.account.update({
          where: { id: newDestinationId },
          data: { balance: { increment: newAmount } },
        });
      }
    } else {
      // INCOME/EXPENSE -> INCOME/EXPENSE: Original logic
      const oldImpact =
        oldType === "INCOME" ? oldAmount - oldFee : -(oldAmount + oldFee);
      const newImpact =
        newType === "INCOME" ? newAmount - newFee : -(newAmount + newFee);
      const adjustment = newImpact - oldImpact;

      if (adjustment !== 0) {
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { increment: adjustment } },
        });
      }
    }

    return updated;
  });

  // Log successful transaction update
  console.log("[DB] Transaction updated successfully", {
    operation: "updateTransaction",
    transactionId: transaction.id,
    organizationId,
    accountId,
    userId,
    newVersion: transaction.version,
    fieldsChanged: fieldChanges.length,
    editType,
    timestamp: new Date().toISOString(),
  });

  return formatTransaction(transaction);
}

export async function deleteTransaction(
  organizationId: string,
  accountId: string,
  transactionId: string,
): Promise<void> {
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

  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
  });

  if (!existing) {
    throw new AppError("Transaction not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({
      where: { id: transactionId },
    });

    if (existing.transactionType === "TRANSFER") {
      // Reverse TRANSFER: add back to source, subtract from destination
      const sourceReversal =
        existing.amount.toNumber() + (existing.feeAmount?.toNumber() ?? 0);

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: sourceReversal,
          },
        },
      });

      if (existing.destinationAccountId) {
        await tx.account.update({
          where: { id: existing.destinationAccountId },
          data: {
            balance: {
              decrement: existing.amount.toNumber(),
            },
          },
        });
      }
    } else {
      // Reverse INCOME or EXPENSE
      const amountImpact =
        existing.transactionType === "INCOME"
          ? -existing.amount.toNumber()
          : existing.amount.toNumber();
      const feeReversal = existing.feeAmount?.toNumber() ?? 0;
      const totalReversal = amountImpact + feeReversal;

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: totalReversal,
          },
        },
      });
    }
  });
}
