import { z } from "zod";
import { transactionStatusEnum } from "./transaction.js";

/**
 * Schema for transaction export query parameters
 */
export const exportQuerySchema = z.object({
  startDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("Start date for transaction filtering (ISO 8601)"),
  endDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe("End date for transaction filtering (ISO 8601)"),
  statuses: z
    .array(transactionStatusEnum)
    .optional()
    .describe("Filter by transaction statuses"),
  includeDeleted: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include soft-deleted transactions"),
});

export type ExportQueryDto = z.infer<typeof exportQuerySchema>;
