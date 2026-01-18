/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string */
// Disable unsafe any rules for pino-http which uses any for Express compatibility
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger.js";
import type { Request, Response, NextFunction } from "express";

/**
 * Pino HTTP middleware for request logging
 * - Adds correlation IDs to all requests
 * - Logs request/response with timing
 * - Adds logger to req object for use in route handlers
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => {
    // Use existing request ID from header or generate new one
    const existingId = req.headers["x-request-id"];
    return existingId ? String(existingId) : randomUUID();
  },
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "duration",
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      // Don't log sensitive headers
      headers: {
        host: req.headers.host,
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type":
          typeof res.getHeader === "function"
            ? res.getHeader("content-type")
            : res.headers?.["content-type"],
        "content-length":
          typeof res.getHeader === "function"
            ? res.getHeader("content-length")
            : res.headers?.["content-length"],
      },
    }),
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed with ${res.statusCode}`;
  },
  customErrorMessage: (req, res, error) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`;
  },
  customLogLevel: (_req, res) => {
    if (res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    if (res.statusCode >= 300) return "info";
    return "debug";
  },
});

/**
 * Middleware to add correlation ID to response headers
 * This allows clients to track requests across services
 */
export function correlationId(req: Request, res: Response, next: NextFunction) {
  const requestId = req.id ? String(req.id) : randomUUID();
  res.setHeader("X-Request-Id", requestId);
  next();
}

/**
 * Middleware to add user context to logger
 * Should be used after authentication middleware
 */
export function addUserContext(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.user) {
    req.log = req.log.child({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  }
  next();
}

/**
 * Extend Express Request type to include Pino logger
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      log: typeof logger;
      id: string;
    }
  }
}
