import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { ERROR_IDS } from "../constants/errorIds.js";
import type { ExportQueryDto } from "../schemas/export.js";

interface CategoryWithParent {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  path: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
}

interface ExportTransactionRow {
  date: Date;
  vendor: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  fee: number;
  status: string;
  balance: number;
}

interface CategorySummary {
  categoryName: string;
  income: number;
  expense: number;
  net: number;
  count: number;
}

/**
 * Calculate starting balance for an account at a specific date
 * by working backward from current balance
 */
async function calculateStartingBalance(
  accountId: string,
  startDate: Date,
): Promise<number> {
  // Get current account balance
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { balance: true },
  });

  if (!account) {
    throw new AppError(
      "Account not found",
      404,
      undefined,
      ERROR_IDS.EXPORT_ACCOUNT_NOT_FOUND,
    );
  }

  // Sum all transactions from startDate to now (what we need to "undo")
  const result = await prisma.$queryRaw<
    [{ adjustment: Prisma.Decimal | null }]
  >`
    SELECT COALESCE(SUM(
      CASE
        WHEN transaction_type = 'INCOME' THEN amount - COALESCE(fee_amount, 0)
        WHEN transaction_type = 'EXPENSE' THEN -(amount + COALESCE(fee_amount, 0))
        WHEN transaction_type = 'TRANSFER' AND account_id::text = ${accountId}
          THEN -(amount + COALESCE(fee_amount, 0))
        WHEN transaction_type = 'TRANSFER' AND destination_account_id::text = ${accountId}
          THEN amount
        ELSE 0
      END
    ), 0) as adjustment
    FROM transactions
    WHERE (account_id::text = ${accountId} OR destination_account_id::text = ${accountId})
      AND date >= ${startDate}
      AND deleted_at IS NULL
  `;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const adjustmentDecimal = result[0]?.adjustment;
  const adjustment = adjustmentDecimal
    ? new Prisma.Decimal(adjustmentDecimal.toString()).toNumber()
    : 0;
  const currentBalance = new Prisma.Decimal(
    account.balance.toString(),
  ).toNumber();

  return currentBalance - adjustment;
}

/**
 * Get category hierarchy map for the organization
 */
async function getCategoryHierarchy(
  organizationId: string,
): Promise<Map<string, CategoryWithParent>> {
  const categories = await prisma.category.findMany({
    where: {
      organizationId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      depth: true,
      path: true,
      parent: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return new Map(categories.map((c) => [c.id, c]));
}

/**
 * Get parent category name for grouping
 * If category has a parent, use parent name. Otherwise use category's own name.
 */
function getParentCategoryName(
  categoryId: string,
  categoryMap: Map<string, CategoryWithParent>,
): string {
  const category = categoryMap.get(categoryId);
  if (!category) return "Uncategorized";

  // If category has a parent, use parent name for grouping
  if (category.parent) {
    return category.parent.name;
  }

  // Otherwise, use the category's own name (it's a top-level category)
  return category.name;
}

/**
 * Calculate transaction impact on account balance
 */
function calculateTransactionImpact(
  transaction: {
    transactionType: string;
    amount: Prisma.Decimal;
    feeAmount: Prisma.Decimal | null;
    accountId: string;
    destinationAccountId: string | null;
  },
  accountId: string,
): number {
  const amount = new Prisma.Decimal(transaction.amount.toString()).toNumber();
  const fee = transaction.feeAmount
    ? new Prisma.Decimal(transaction.feeAmount.toString()).toNumber()
    : 0;

  switch (transaction.transactionType) {
    case "INCOME":
      return amount - fee;
    case "EXPENSE":
      return -(amount + fee);
    case "TRANSFER":
      // If this account is the source, it's a debit
      if (transaction.accountId === accountId) {
        return -(amount + fee);
      }
      // If this account is the destination, it's a credit
      if (transaction.destinationAccountId === accountId) {
        return amount;
      }
      return 0;
    default:
      return 0;
  }
}

/**
 * Format transaction for Excel row
 */
function formatTransactionRow(
  transaction: {
    date: Date;
    vendor?: { name: string } | null;
    description: string | null;
    splits: {
      amount: Prisma.Decimal;
      category: {
        id: string;
        name: string;
        parentId: string | null;
      };
    }[];
    transactionType: string;
    amount: Prisma.Decimal;
    feeAmount: Prisma.Decimal | null;
    status: string;
  },
  balance: number,
  categoryMap: Map<string, CategoryWithParent>,
): ExportTransactionRow {
  // Get category names (show parent if exists)
  const categoryNames = transaction.splits
    .map((split) => getParentCategoryName(split.category.id, categoryMap))
    .join(", ");

  const amount = new Prisma.Decimal(transaction.amount.toString()).toNumber();
  const fee = transaction.feeAmount
    ? new Prisma.Decimal(transaction.feeAmount.toString()).toNumber()
    : 0;

  return {
    date: transaction.date,
    vendor: transaction.vendor?.name ?? "",
    description: transaction.description ?? "",
    category: categoryNames || "Uncategorized",
    type: transaction.transactionType,
    amount,
    fee,
    status: transaction.status,
    balance,
  };
}

/**
 * Generate Excel workbook for transaction export
 */
export async function generateTransactionExport(
  organizationId: string,
  accountId: string,
  filters: ExportQueryDto,
): Promise<ExcelJS.Buffer> {
  try {
    // Validate date range
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      if (start >= end) {
        throw new AppError(
          "Invalid date range: startDate must be before endDate",
          400,
          undefined,
          ERROR_IDS.EXPORT_INVALID_DATE_RANGE,
        );
      }
    }

    // Fetch account, starting balance, and category hierarchy in parallel
    const [account, categoryMap] = await Promise.all([
      prisma.account.findFirst({
        where: {
          id: accountId,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          accountType: true,
          balance: true,
          institution: true,
        },
      }),
      getCategoryHierarchy(organizationId),
    ]);

    if (!account) {
      throw new AppError(
        "Account not found",
        404,
        undefined,
        ERROR_IDS.EXPORT_ACCOUNT_NOT_FOUND,
      );
    }

    // Calculate starting balance if startDate is provided
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const startingBalance = startDate
      ? await calculateStartingBalance(accountId, startDate)
      : 0;

    // Build where clause for transaction query
    const whereClause: Prisma.TransactionWhereInput = {
      accountId,
      ...(filters.startDate && {
        date: { gte: new Date(filters.startDate) },
      }),
      ...(filters.endDate && {
        date: {
          ...(filters.startDate && { gte: new Date(filters.startDate) }),
          lte: new Date(filters.endDate),
        },
      }),
      ...(filters.statuses && {
        status: { in: filters.statuses },
      }),
      ...(filters.includeDeleted
        ? {}
        : {
            deletedAt: null,
          }),
    };

    // Fetch all transactions with eager loading
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
        splits: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { date: "asc" }],
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Treasurer";
    workbook.created = new Date();

    // Add Summary sheet
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { key: "label", width: 30 },
      { key: "value", width: 30 },
    ];

    summarySheet.addRow({ label: "Account Name", value: account.name });
    summarySheet.addRow({
      label: "Account Type",
      value: account.accountType,
    });
    summarySheet.addRow({
      label: "Institution",
      value: account.institution ?? "N/A",
    });
    summarySheet.addRow({
      label: "Export Date",
      value: new Date().toLocaleDateString(),
    });
    summarySheet.addRow({
      label: "Date Range",
      value:
        filters.startDate && filters.endDate
          ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
          : "All Time",
    });
    summarySheet.addRow({
      label: "Starting Balance",
      value: `$${startingBalance.toFixed(2)}`,
    });
    summarySheet.addRow({
      label: "Total Transactions",
      value: transactions.length,
    });

    // Style summary sheet
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getColumn(1).font = { bold: true };

    // Group transactions by status
    const clearedTransactions = transactions.filter(
      (t) => t.status === "CLEARED" || t.status === "RECONCILED",
    );
    const unclearedTransactions = transactions.filter(
      (t) => t.status === "UNCLEARED",
    );

    // Add Cleared/Reconciled Transactions sheet
    const clearedSheet = workbook.addWorksheet("Cleared Transactions");
    clearedSheet.columns = [
      { key: "date", header: "Date", width: 12 },
      { key: "vendor", header: "Vendor", width: 20 },
      { key: "description", header: "Description", width: 30 },
      { key: "category", header: "Category", width: 20 },
      { key: "type", header: "Type", width: 12 },
      { key: "amount", header: "Amount", width: 12 },
      { key: "fee", header: "Fee", width: 10 },
      { key: "status", header: "Status", width: 12 },
      { key: "balance", header: "Balance", width: 15 },
    ];

    let runningBalance = startingBalance;
    clearedTransactions.forEach((txn) => {
      runningBalance += calculateTransactionImpact(txn, accountId);
      const row = formatTransactionRow(txn, runningBalance, categoryMap);
      clearedSheet.addRow({
        date: row.date,
        vendor: row.vendor,
        description: row.description,
        category: row.category,
        type: row.type,
        amount: row.amount,
        fee: row.fee,
        status: row.status,
        balance: row.balance,
      });
    });

    // Style cleared sheet
    clearedSheet.getRow(1).font = { bold: true };
    clearedSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Add Uncleared Transactions sheet (To Be Paid)
    const unclearedSheet = workbook.addWorksheet("To Be Paid");
    unclearedSheet.columns = clearedSheet.columns;

    unclearedTransactions.forEach((txn) => {
      runningBalance += calculateTransactionImpact(txn, accountId);
      const row = formatTransactionRow(txn, runningBalance, categoryMap);
      unclearedSheet.addRow({
        date: row.date,
        vendor: row.vendor,
        description: row.description,
        category: row.category,
        type: row.type,
        amount: row.amount,
        fee: row.fee,
        status: row.status,
        balance: row.balance,
      });
    });

    // Style uncleared sheet
    unclearedSheet.getRow(1).font = { bold: true };
    unclearedSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFE0" },
    };

    // Calculate category summaries
    const categorySummaries = new Map<string, CategorySummary>();

    transactions.forEach((txn) => {
      txn.splits.forEach((split) => {
        const parentName = getParentCategoryName(
          split.category.id,
          categoryMap,
        );
        const existing = categorySummaries.get(parentName) || {
          categoryName: parentName,
          income: 0,
          expense: 0,
          net: 0,
          count: 0,
        };

        const splitAmount = new Prisma.Decimal(
          split.amount.toString(),
        ).toNumber();

        if (txn.transactionType === "INCOME") {
          existing.income += splitAmount;
          existing.net += splitAmount;
        } else if (txn.transactionType === "EXPENSE") {
          existing.expense += splitAmount;
          existing.net -= splitAmount;
        }

        existing.count += 1;
        categorySummaries.set(parentName, existing);
      });
    });

    // Add Category Summary sheet
    const categorySheet = workbook.addWorksheet("Category Summary");
    categorySheet.columns = [
      { key: "category", header: "Category", width: 30 },
      { key: "income", header: "Income", width: 15 },
      { key: "expense", header: "Expense", width: 15 },
      { key: "net", header: "Net", width: 15 },
      { key: "count", header: "Transaction Count", width: 18 },
    ];

    // Sort categories by name
    const sortedCategories = Array.from(categorySummaries.values()).sort(
      (a, b) => a.categoryName.localeCompare(b.categoryName),
    );

    sortedCategories.forEach((summary) => {
      categorySheet.addRow({
        category: summary.categoryName,
        income: summary.income,
        expense: summary.expense,
        net: summary.net,
        count: summary.count,
      });
    });

    // Style category sheet
    categorySheet.getRow(1).font = { bold: true };
    categorySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("[ExportService] Export generation failed", error);
    throw new AppError(
      "Failed to generate transaction export",
      500,
      undefined,
      ERROR_IDS.EXPORT_GENERATION_FAILED,
    );
  }
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  accountName: string,
  startDate?: string,
  endDate?: string,
): string {
  const sanitizedName = accountName.replace(/[^a-zA-Z0-9_-]/g, "_");

  if (startDate && endDate) {
    const start = new Date(startDate).toISOString().split("T")[0] ?? "";
    const end = new Date(endDate).toISOString().split("T")[0] ?? "";
    return `${sanitizedName}_Transactions_${start}_to_${end}.xlsx`;
  }

  return `${sanitizedName}_Transactions_All_Time.xlsx`;
}
