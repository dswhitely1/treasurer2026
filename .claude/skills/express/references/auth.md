# Authentication & Authorization Reference

## Contents
- JWT Authentication
- Type Augmentation
- Organization Middleware
- Role-Based Authorization
- Authorization Matrix

## JWT Authentication

JWT tokens are validated in middleware before route handlers:

```typescript
// src/middleware/auth.ts
export const authenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401)
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'USER' | 'ADMIN'
    }
    next()
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }
}
```

### Token Generation

```typescript
// src/services/authService.ts
function generateToken(userId: string, email: string, role: string): string {
  const payload: JwtPayload = { userId, email, role }
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}
```

## Type Augmentation

Extend Express Request type to include custom properties:

```typescript
// src/middleware/organization.ts
declare global {
  namespace Express {
    interface Request {
      orgMembership?: {
        orgId: string
        role: OrganizationRole
      }
    }
  }
}

// src/types/index.ts (or middleware/auth.ts)
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: 'USER' | 'ADMIN'
      }
    }
  }
}
```

### Using Augmented Types

```typescript
// In controller - req.user is typed
export const create: RequestHandler = async (req, res, next) => {
  const userId = req.user?.id  // TypeScript knows the shape
  if (!req.user) throw new AppError('Authentication required', 401)
}
```

## Organization Middleware

Check organization membership and role:

```typescript
// src/middleware/organization.ts
export const requireOrgMembership = (): RequestHandler => {
  return async (req, _res, next) => {
    try {
      if (!req.user) throw new AppError('Authentication required', 401)

      const orgId = req.params.orgId
      if (!orgId) throw new AppError('Organization ID required', 400)

      const role = await getMemberRole(req.user.id, orgId)
      if (!role) throw new AppError('You are not a member of this organization', 403)

      req.orgMembership = { orgId, role }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export const requireOrgRole = (...allowedRoles: OrganizationRole[]): RequestHandler => {
  return async (req, _res, next) => {
    try {
      if (!req.user) throw new AppError('Authentication required', 401)

      const role = await getMemberRole(req.user.id, req.params.orgId)
      if (!role) throw new AppError('You are not a member of this organization', 403)
      if (!allowedRoles.includes(role)) throw new AppError('Insufficient permissions', 403)

      req.orgMembership = { orgId: req.params.orgId, role }
      next()
    } catch (error) {
      next(error)
    }
  }
}
```

## Role-Based Authorization

Three organization roles with different permissions:

| Role | Permissions |
|------|-------------|
| OWNER | Full control including org deletion |
| ADMIN | Create/update/delete resources, cannot delete org |
| MEMBER | Read-only access |

### Usage in Routes

```typescript
// Read access - any member
router.get('/', requireOrgMembership(), list)

// Write access - OWNER or ADMIN only
router.post('/', requireOrgRole('OWNER', 'ADMIN'), create)
router.patch('/:id', requireOrgRole('OWNER', 'ADMIN'), update)
router.delete('/:id', requireOrgRole('OWNER', 'ADMIN'), remove)

// Owner only
router.delete('/org/:orgId', requireOrgRole('OWNER'), deleteOrganization)
```

## Authorization Matrix

| Resource | Operation | MEMBER | ADMIN | OWNER |
|----------|-----------|--------|-------|-------|
| Organizations | Read | ✅ | ✅ | ✅ |
| Organizations | Update | ❌ | ✅ | ✅ |
| Organizations | Delete | ❌ | ❌ | ✅ |
| Accounts | Read | ✅ | ✅ | ✅ |
| Accounts | Create/Update/Delete | ❌ | ✅ | ✅ |
| Transactions | Read | ✅ | ✅ | ✅ |
| Transactions | Create/Update/Delete | ❌ | ✅ | ✅ |

## Anti-Patterns

### WARNING: Checking Role in Controller

**The Problem:**

```typescript
// BAD - Auth logic in controller
export const update: RequestHandler = async (req, res, next) => {
  const role = await getMemberRole(req.user.id, req.params.orgId)
  if (role !== 'OWNER' && role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  // ... rest of handler
}
```

**Why This Breaks:**
- Duplicated across every controller
- Easy to forget
- Inconsistent error responses

**The Fix:**

```typescript
// GOOD - Use middleware
router.patch('/:id', requireOrgRole('OWNER', 'ADMIN'), update)