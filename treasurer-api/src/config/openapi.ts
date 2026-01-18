export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Treasurer API',
    version: '0.1.0',
    description: 'API for the Treasurer application',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          message: { type: 'string' },
          errors: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string' },
        },
      },
      TransactionStatus: {
        type: 'string',
        enum: ['UNCLEARED', 'CLEARED', 'RECONCILED'],
      },
      StatusChangeRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { $ref: '#/components/schemas/TransactionStatus' },
          notes: { type: 'string', maxLength: 500 },
        },
      },
      BulkStatusChangeRequest: {
        type: 'object',
        required: ['transactionIds', 'status'],
        properties: {
          transactionIds: {
            type: 'array',
            items: { type: 'string', format: 'uuid' },
            minItems: 1,
            maxItems: 100,
          },
          status: { $ref: '#/components/schemas/TransactionStatus' },
          notes: { type: 'string', maxLength: 500 },
        },
      },
      StatusHistoryInfo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fromStatus: { $ref: '#/components/schemas/TransactionStatus' },
          toStatus: { $ref: '#/components/schemas/TransactionStatus' },
          changedById: { type: 'string', format: 'uuid' },
          changedByName: { type: 'string' },
          changedByEmail: { type: 'string', format: 'email' },
          changedAt: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
        },
      },
      ReconciliationSummary: {
        type: 'object',
        properties: {
          accountId: { type: 'string', format: 'uuid' },
          accountName: { type: 'string' },
          uncleared: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
              total: { type: 'string' },
            },
          },
          cleared: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
              total: { type: 'string' },
            },
          },
          reconciled: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
              total: { type: 'string' },
            },
          },
          overall: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
              total: { type: 'string' },
            },
          },
        },
      },
      BulkStatusChangeResult: {
        type: 'object',
        properties: {
          successful: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                transactionId: { type: 'string', format: 'uuid' },
                status: { $ref: '#/components/schemas/TransactionStatus' },
              },
            },
          },
          failed: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                transactionId: { type: 'string', format: 'uuid' },
                error: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user info',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'List of users' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'User found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          404: { description: 'User not found' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User updated' },
          404: { description: 'User not found' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'User deleted' },
          403: { description: 'Forbidden' },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}/status': {
      patch: {
        tags: ['Transaction Status'],
        summary: 'Change transaction status',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orgId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'transactionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StatusChangeRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Transaction status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        history: { $ref: '#/components/schemas/StatusHistoryInfo' },
                      },
                    },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid status transition or reconciled transaction' },
          401: { description: 'Unauthorized' },
          403: { description: 'Insufficient permissions' },
          404: { description: 'Transaction not found' },
        },
      },
    },
    '/api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}/status/history': {
      get: {
        tags: ['Transaction Status'],
        summary: 'Get transaction status history',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orgId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'transactionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Transaction status history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        history: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/StatusHistoryInfo' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          404: { description: 'Transaction not found' },
        },
      },
    },
    '/api/organizations/{orgId}/accounts/{accountId}/transactions/status/bulk': {
      post: {
        tags: ['Transaction Status'],
        summary: 'Bulk change transaction status',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orgId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BulkStatusChangeRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'All transactions updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/BulkStatusChangeResult' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          207: {
            description: 'Bulk operation completed with partial success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/BulkStatusChangeResult' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          403: { description: 'Insufficient permissions' },
          404: { description: 'Account not found' },
        },
      },
    },
    '/api/organizations/{orgId}/accounts/{accountId}/transactions/status/summary': {
      get: {
        tags: ['Transaction Status'],
        summary: 'Get reconciliation summary for account',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'orgId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'accountId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Reconciliation summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        summary: { $ref: '#/components/schemas/ReconciliationSummary' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
          404: { description: 'Account not found' },
        },
      },
    },
  },
}
