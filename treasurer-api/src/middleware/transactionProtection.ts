import type { RequestHandler } from "express";
import { validateTransactionNotReconciled } from "../services/transactionStatusService.js";

/**
 * Middleware to prevent modification of reconciled transactions.
 * Apply this to PATCH and DELETE endpoints for transactions.
 */
export const preventReconciledModification = (): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const transactionId = req.params.transactionId;

      if (!transactionId || Array.isArray(transactionId)) {
        next();
        return;
      }

      await validateTransactionNotReconciled(transactionId);
      next();
    } catch (error) {
      next(error);
    }
  };
};
