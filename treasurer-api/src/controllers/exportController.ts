import type { RequestHandler } from "express";
import {
  generateTransactionExport,
  generateExportFilename,
} from "../services/exportService.js";
import type { ExportQueryDto } from "../schemas/export.js";
import { prisma } from "../config/database.js";

/**
 * Export transactions to Excel
 * GET /api/organizations/:orgId/accounts/:accountId/transactions/export
 */
export const exportTransactions: RequestHandler = async (req, res, next) => {
  try {
    const { orgId, accountId } = req.params as {
      orgId: string;
      accountId: string;
    };
    const query = req.query as unknown as ExportQueryDto;

    // Generate Excel export
    const buffer = await generateTransactionExport(orgId, accountId, query);

    // Get account name for filename (already validated in service)
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { name: true },
    });

    const filename = generateExportFilename(
      account?.name ?? "Account",
      query.startDate,
      query.endDate,
    );

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", Buffer.byteLength(buffer).toString());

    // Send buffer
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
