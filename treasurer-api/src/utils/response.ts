import type { Response } from 'express'
import type { ApiResponse, PaginatedResponse } from '../types/index.js'

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  }
  res.status(statusCode).json(response)
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
): void {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  }
  res.status(statusCode).json(response)
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginatedResponse<T>['pagination']
): void {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination,
  }
  res.status(200).json(response)
}
