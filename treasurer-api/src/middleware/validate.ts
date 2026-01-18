/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Disable unsafe assignment for Zod parse results assigned to Express req properties
import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    next();
  };
};
