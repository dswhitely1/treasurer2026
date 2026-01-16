# Multi-Organization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to belong to multiple organizations, create organizations, and switch between them.

**Architecture:** Add Organization and OrganizationMember models to Prisma. Create organization CRUD service/routes with membership middleware. Enhance /auth/me to return organization context. Add Redux organization slice and header switcher component. Restructure routes to be organization-scoped.

**Tech Stack:** Prisma (PostgreSQL), Express, Zod, Redux Toolkit, React Router, Tailwind CSS

---

## Phase 1: Backend Database Schema

### Task 1.1: Update Prisma Schema

**Files:**
- Modify: `treasurer-api/prisma/schema.prisma`

**Step 1: Add OrganizationRole enum and models**

Add after the existing `Role` enum:

```prisma
enum OrganizationRole {
  OWNER
  ADMIN
  MEMBER
}

model Organization {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  members   OrganizationMember[]

  @@map("organizations")
}

model OrganizationMember {
  id             String           @id @default(uuid())
  userId         String           @map("user_id")
  organizationId String           @map("organization_id")
  role           OrganizationRole @default(MEMBER)
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@map("organization_members")
}
```

**Step 2: Update User model**

Add to User model:

```prisma
model User {
  // ... existing fields ...
  lastOrganizationId String? @map("last_organization_id")

  memberships OrganizationMember[]
}
```

**Step 3: Generate Prisma client**

Run: `cd treasurer-api && pnpm db:generate`

**Step 4: Create migration**

Run: `cd treasurer-api && pnpm db:migrate --name add_organizations`

**Step 5: Commit**

```bash
git add treasurer-api/prisma/
git commit -m "feat(db): add Organization and OrganizationMember models"
```

---

## Phase 2: Backend Organization Types

### Task 2.1: Add Organization Types

**Files:**
- Modify: `treasurer-api/src/types/index.ts`

**Step 1: Add organization types**

Add to `src/types/index.ts`:

```typescript
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface OrganizationSummary {
  id: string
  name: string
  role: OrganizationRole
}

export interface OrganizationMemberInfo {
  id: string
  userId: string
  email: string
  name: string | null
  role: OrganizationRole
  joinedAt: string
}
```

**Step 2: Commit**

```bash
git add treasurer-api/src/types/
git commit -m "feat(types): add organization type definitions"
```

---

## Phase 3: Backend Organization Schemas

### Task 3.1: Create Organization Validation Schemas

**Files:**
- Create: `treasurer-api/src/schemas/organization.ts`

**Step 1: Create the schema file**

```typescript
import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
})

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
})

export const orgIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
})

export const memberParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  userId: z.string().uuid('Invalid user ID'),
})

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>
export type AddMemberDto = z.infer<typeof addMemberSchema>
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>
```

**Step 2: Commit**

```bash
git add treasurer-api/src/schemas/organization.ts
git commit -m "feat(schemas): add organization validation schemas"
```

---

## Phase 4: Backend Organization Service

### Task 4.1: Create Organization Service - Part 1 (CRUD)

**Files:**
- Create: `treasurer-api/src/services/organizationService.ts`
- Test: `treasurer-api/tests/services/organizationService.test.ts`

**Step 1: Write failing test for createOrganization**

Create `treasurer-api/tests/services/organizationService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '../../src/config/database'
import { createOrganization } from '../../src/services/organizationService'

vi.mock('../../src/config/database', () => ({
  prisma: {
    organization: {
      create: vi.fn(),
    },
    organizationMember: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('organizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createOrganization', () => {
    it('should create organization and add creator as owner', async () => {
      const mockOrg = { id: 'org-1', name: 'Test Org', createdAt: new Date(), updatedAt: new Date() }
      const mockMember = { id: 'member-1', userId: 'user-1', organizationId: 'org-1', role: 'OWNER' }

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          organization: { create: vi.fn().mockResolvedValue(mockOrg) },
          organizationMember: { create: vi.fn().mockResolvedValue(mockMember) },
        } as any)
      })

      const result = await createOrganization('user-1', { name: 'Test Org' })

      expect(result).toEqual({
        id: 'org-1',
        name: 'Test Org',
        role: 'OWNER',
      })
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd treasurer-api && pnpm test -- tests/services/organizationService.test.ts --run`
Expected: FAIL with "createOrganization is not exported"

**Step 3: Write minimal implementation**

Create `treasurer-api/src/services/organizationService.ts`:

```typescript
import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import type { OrganizationRole, OrganizationSummary, OrganizationMemberInfo } from '../types/index.js'

export interface CreateOrganizationInput {
  name: string
}

export interface UpdateOrganizationInput {
  name: string
}

export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput
): Promise<OrganizationSummary> {
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.name },
    })

    await tx.organizationMember.create({
      data: {
        userId,
        organizationId: organization.id,
        role: 'OWNER',
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: { lastOrganizationId: organization.id },
    })

    return organization
  })

  return {
    id: result.id,
    name: result.name,
    role: 'OWNER',
  }
}

export async function getUserOrganizations(userId: string): Promise<OrganizationSummary[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  })

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role as OrganizationRole,
  }))
}

export async function getOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  if (!org) {
    throw new AppError('Organization not found', 404)
  }

  return org
}

export async function updateOrganization(orgId: string, input: UpdateOrganizationInput) {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { name: input.name },
  })

  return org
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await prisma.organization.delete({
    where: { id: orgId },
  })
}

export async function getMemberRole(
  userId: string,
  orgId: string
): Promise<OrganizationRole | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  })

  return membership?.role as OrganizationRole | null
}

export async function switchOrganization(userId: string, orgId: string): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('You are not a member of this organization', 403)
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastOrganizationId: orgId },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `cd treasurer-api && pnpm test -- tests/services/organizationService.test.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add treasurer-api/src/services/organizationService.ts treasurer-api/tests/services/
git commit -m "feat(service): add organization service with CRUD operations"
```

---

### Task 4.2: Create Organization Service - Part 2 (Members)

**Files:**
- Modify: `treasurer-api/src/services/organizationService.ts`

**Step 1: Add member management functions**

Add to `organizationService.ts`:

```typescript
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMemberInfo[]> {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role as OrganizationRole,
    joinedAt: m.createdAt.toISOString(),
  }))
}

export async function addMember(
  orgId: string,
  email: string,
  role: OrganizationRole = 'MEMBER'
): Promise<OrganizationMemberInfo> {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new AppError('User not found. They must create an account first.', 404)
  }

  const existingMember = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
  })

  if (existingMember) {
    throw new AppError('User is already a member of this organization', 409)
  }

  const member = await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: orgId,
      role,
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  })

  return {
    id: member.id,
    userId: member.user.id,
    email: member.user.email,
    name: member.user.name,
    role: member.role as OrganizationRole,
    joinedAt: member.createdAt.toISOString(),
  }
}

export async function updateMemberRole(
  orgId: string,
  targetUserId: string,
  newRole: OrganizationRole
): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('Member not found', 404)
  }

  await prisma.organizationMember.update({
    where: { id: membership.id },
    data: { role: newRole },
  })
}

export async function removeMember(orgId: string, targetUserId: string): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('Member not found', 404)
  }

  await prisma.organizationMember.delete({
    where: { id: membership.id },
  })

  // Clear lastOrganizationId if this was their current org
  await prisma.user.updateMany({
    where: { id: targetUserId, lastOrganizationId: orgId },
    data: { lastOrganizationId: null },
  })
}

export async function leaveOrganization(userId: string, orgId: string): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('You are not a member of this organization', 403)
  }

  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: orgId, role: 'OWNER' },
    })

    if (ownerCount === 1) {
      throw new AppError('Cannot leave organization as the only owner. Transfer ownership first or delete the organization.', 400)
    }
  }

  await prisma.organizationMember.delete({
    where: { id: membership.id },
  })

  await prisma.user.updateMany({
    where: { id: userId, lastOrganizationId: orgId },
    data: { lastOrganizationId: null },
  })
}
```

**Step 2: Commit**

```bash
git add treasurer-api/src/services/organizationService.ts
git commit -m "feat(service): add member management to organization service"
```

---

## Phase 5: Backend Organization Middleware

### Task 5.1: Create Organization Authorization Middleware

**Files:**
- Create: `treasurer-api/src/middleware/organization.ts`

**Step 1: Create the middleware file**

```typescript
import type { RequestHandler } from 'express'
import { AppError } from './errorHandler.js'
import { getMemberRole } from '../services/organizationService.js'
import type { OrganizationRole } from '../types/index.js'

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

export const requireOrgMembership = (): RequestHandler => {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401)
      }

      const orgId = req.params.orgId
      if (!orgId) {
        throw new AppError('Organization ID required', 400)
      }

      const role = await getMemberRole(req.user.id, orgId)
      if (!role) {
        throw new AppError('You are not a member of this organization', 403)
      }

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
      if (!req.user) {
        throw new AppError('Authentication required', 401)
      }

      const orgId = req.params.orgId
      if (!orgId) {
        throw new AppError('Organization ID required', 400)
      }

      const role = await getMemberRole(req.user.id, orgId)
      if (!role) {
        throw new AppError('You are not a member of this organization', 403)
      }

      if (!allowedRoles.includes(role)) {
        throw new AppError('Insufficient permissions', 403)
      }

      req.orgMembership = { orgId, role }
      next()
    } catch (error) {
      next(error)
    }
  }
}
```

**Step 2: Commit**

```bash
git add treasurer-api/src/middleware/organization.ts
git commit -m "feat(middleware): add organization authorization middleware"
```

---

## Phase 6: Backend Organization Controller

### Task 6.1: Create Organization Controller

**Files:**
- Create: `treasurer-api/src/controllers/organizationController.ts`

**Step 1: Create the controller file**

```typescript
import type { RequestHandler } from 'express'
import {
  createOrganization,
  getUserOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  addMember,
  updateMemberRole,
  removeMember,
  leaveOrganization,
  switchOrganization,
} from '../services/organizationService.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
  UpdateMemberRoleDto,
} from '../schemas/organization.js'

export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateOrganizationDto
    const result = await createOrganization(req.user!.id, data)
    sendSuccess(res, result, 'Organization created successfully', 201)
  } catch (error) {
    next(error)
  }
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const organizations = await getUserOrganizations(req.user!.id)
    sendSuccess(res, { organizations })
  } catch (error) {
    next(error)
  }
}

export const get: RequestHandler = async (req, res, next) => {
  try {
    const org = await getOrganization(req.params.orgId)
    sendSuccess(res, {
      organization: {
        id: org.id,
        name: org.name,
        role: req.orgMembership!.role,
        createdAt: org.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

export const update: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateOrganizationDto
    const org = await updateOrganization(req.params.orgId, data)
    sendSuccess(res, {
      organization: { id: org.id, name: org.name },
    }, 'Organization updated successfully')
  } catch (error) {
    next(error)
  }
}

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await deleteOrganization(req.params.orgId)
    sendSuccess(res, null, 'Organization deleted successfully')
  } catch (error) {
    next(error)
  }
}

export const listMembers: RequestHandler = async (req, res, next) => {
  try {
    const members = await getOrganizationMembers(req.params.orgId)
    sendSuccess(res, { members })
  } catch (error) {
    next(error)
  }
}

export const addMemberHandler: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as AddMemberDto
    const member = await addMember(req.params.orgId, data.email)
    sendSuccess(res, { member }, 'Member added successfully', 201)
  } catch (error) {
    next(error)
  }
}

export const updateMemberRoleHandler: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateMemberRoleDto
    await updateMemberRole(req.params.orgId, req.params.userId, data.role)
    sendSuccess(res, null, 'Member role updated successfully')
  } catch (error) {
    next(error)
  }
}

export const removeMemberHandler: RequestHandler = async (req, res, next) => {
  try {
    await removeMember(req.params.orgId, req.params.userId)
    sendSuccess(res, null, 'Member removed successfully')
  } catch (error) {
    next(error)
  }
}

export const leave: RequestHandler = async (req, res, next) => {
  try {
    await leaveOrganization(req.user!.id, req.params.orgId)
    sendSuccess(res, null, 'Successfully left organization')
  } catch (error) {
    next(error)
  }
}

export const switchOrg: RequestHandler = async (req, res, next) => {
  try {
    await switchOrganization(req.user!.id, req.params.orgId)
    sendSuccess(res, null, 'Switched organization successfully')
  } catch (error) {
    next(error)
  }
}
```

**Step 2: Commit**

```bash
git add treasurer-api/src/controllers/organizationController.ts
git commit -m "feat(controller): add organization controller"
```

---

## Phase 7: Backend Organization Routes

### Task 7.1: Create Organization Routes

**Files:**
- Create: `treasurer-api/src/routes/organizations.ts`
- Modify: `treasurer-api/src/app.ts`

**Step 1: Create the routes file**

```typescript
import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  orgIdParamSchema,
  memberParamSchema,
} from '../schemas/organization.js'
import {
  create,
  list,
  get,
  update,
  remove,
  listMembers,
  addMemberHandler,
  updateMemberRoleHandler,
  removeMemberHandler,
  leave,
  switchOrg,
} from '../controllers/organizationController.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Organization CRUD
router.post('/', validate({ body: createOrganizationSchema }), create)
router.get('/', list)
router.get('/:orgId', validate({ params: orgIdParamSchema }), requireOrgMembership(), get)
router.patch(
  '/:orgId',
  validate({ params: orgIdParamSchema, body: updateOrganizationSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  update
)
router.delete('/:orgId', validate({ params: orgIdParamSchema }), requireOrgRole('OWNER'), remove)

// Organization context
router.post('/:orgId/switch', validate({ params: orgIdParamSchema }), requireOrgMembership(), switchOrg)
router.delete('/:orgId/leave', validate({ params: orgIdParamSchema }), requireOrgMembership(), leave)

// Member management
router.get('/:orgId/members', validate({ params: orgIdParamSchema }), requireOrgMembership(), listMembers)
router.post(
  '/:orgId/members',
  validate({ params: orgIdParamSchema, body: addMemberSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  addMemberHandler
)
router.patch(
  '/:orgId/members/:userId',
  validate({ params: memberParamSchema, body: updateMemberRoleSchema }),
  requireOrgRole('OWNER'),
  updateMemberRoleHandler
)
router.delete(
  '/:orgId/members/:userId',
  validate({ params: memberParamSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  removeMemberHandler
)

export default router
```

**Step 2: Register routes in app.ts**

Add import and route registration:

```typescript
import organizationRouter from './routes/organizations.js'

// Add after existing routes
app.use('/api/organizations', organizationRouter)
```

**Step 3: Commit**

```bash
git add treasurer-api/src/routes/organizations.ts treasurer-api/src/app.ts
git commit -m "feat(routes): add organization routes"
```

---

## Phase 8: Backend Auth Enhancement

### Task 8.1: Update /auth/me Endpoint

**Files:**
- Modify: `treasurer-api/src/services/authService.ts`
- Modify: `treasurer-api/src/controllers/authController.ts`

**Step 1: Add getCurrentUserWithOrgs to authService**

Add to `authService.ts`:

```typescript
import type { OrganizationSummary } from '../types/index.js'

export async function getCurrentUserWithOrgs(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastOrganizationId: true,
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  const organizations: OrganizationSummary[] = user.memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role as 'OWNER' | 'ADMIN' | 'MEMBER',
  }))

  let currentOrganization: OrganizationSummary | null = null

  if (user.lastOrganizationId) {
    currentOrganization = organizations.find((o) => o.id === user.lastOrganizationId) || null
  }

  // If lastOrganizationId is invalid or null, default to first org
  if (!currentOrganization && organizations.length > 0) {
    currentOrganization = organizations[0]
    // Update lastOrganizationId
    await prisma.user.update({
      where: { id: userId },
      data: { lastOrganizationId: currentOrganization.id },
    })
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    organizations,
    currentOrganization,
  }
}
```

**Step 2: Update me controller**

Update `authController.ts`:

```typescript
import { registerUser, loginUser, getCurrentUserWithOrgs } from '../services/authService.js'

export const me: RequestHandler = async (req, res, next) => {
  try {
    const result = await getCurrentUserWithOrgs(req.user!.id)
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
}
```

**Step 3: Commit**

```bash
git add treasurer-api/src/services/authService.ts treasurer-api/src/controllers/authController.ts
git commit -m "feat(auth): enhance /me endpoint with organization context"
```

---

## Phase 9: Frontend Types

### Task 9.1: Add Organization Types

**Files:**
- Modify: `treasurer/src/types/index.ts`

**Step 1: Add organization types**

```typescript
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface OrganizationSummary {
  id: string
  name: string
  role: OrganizationRole
}

export interface OrganizationMember {
  id: string
  userId: string
  email: string
  name: string | null
  role: OrganizationRole
  joinedAt: string
}

export interface Organization {
  id: string
  name: string
  role: OrganizationRole
  createdAt: string
}
```

**Step 2: Commit**

```bash
git add treasurer/src/types/
git commit -m "feat(types): add frontend organization types"
```

---

## Phase 10: Frontend API Client

### Task 10.1: Update Auth API Types

**Files:**
- Modify: `treasurer/src/lib/api/auth.ts`

**Step 1: Update MeResponse type**

```typescript
import type { OrganizationSummary } from '@/types'

export interface MeResponse {
  success: boolean
  data: {
    user: AuthUser
    organizations: OrganizationSummary[]
    currentOrganization: OrganizationSummary | null
  }
}
```

**Step 2: Commit**

```bash
git add treasurer/src/lib/api/auth.ts
git commit -m "feat(api): update auth types for organization support"
```

---

### Task 10.2: Create Organization API Client

**Files:**
- Create: `treasurer/src/lib/api/organizations.ts`

**Step 1: Create the API client**

```typescript
import { api } from '../api'
import type { OrganizationSummary, OrganizationMember, Organization } from '@/types'

export interface CreateOrganizationInput {
  name: string
}

export interface UpdateOrganizationInput {
  name: string
}

export interface AddMemberInput {
  email: string
}

export interface UpdateMemberRoleInput {
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

interface OrganizationResponse {
  success: boolean
  data: OrganizationSummary
  message: string
}

interface OrganizationsListResponse {
  success: boolean
  data: { organizations: OrganizationSummary[] }
}

interface OrganizationDetailResponse {
  success: boolean
  data: { organization: Organization }
}

interface MembersListResponse {
  success: boolean
  data: { members: OrganizationMember[] }
}

interface MemberResponse {
  success: boolean
  data: { member: OrganizationMember }
  message: string
}

interface MessageResponse {
  success: boolean
  message: string
}

export const organizationApi = {
  create: (data: CreateOrganizationInput) =>
    api.post<OrganizationResponse>('/organizations', data),

  list: () =>
    api.get<OrganizationsListResponse>('/organizations'),

  get: (orgId: string) =>
    api.get<OrganizationDetailResponse>(`/organizations/${orgId}`),

  update: (orgId: string, data: UpdateOrganizationInput) =>
    api.patch<MessageResponse>(`/organizations/${orgId}`, data),

  delete: (orgId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}`),

  switch: (orgId: string) =>
    api.post<MessageResponse>(`/organizations/${orgId}/switch`),

  leave: (orgId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}/leave`),

  listMembers: (orgId: string) =>
    api.get<MembersListResponse>(`/organizations/${orgId}/members`),

  addMember: (orgId: string, data: AddMemberInput) =>
    api.post<MemberResponse>(`/organizations/${orgId}/members`, data),

  updateMemberRole: (orgId: string, userId: string, data: UpdateMemberRoleInput) =>
    api.patch<MessageResponse>(`/organizations/${orgId}/members/${userId}`, data),

  removeMember: (orgId: string, userId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}/members/${userId}`),
}
```

**Step 2: Commit**

```bash
git add treasurer/src/lib/api/organizations.ts
git commit -m "feat(api): add organization API client"
```

---

## Phase 11: Frontend State Management

### Task 11.1: Create Organization Slice

**Files:**
- Create: `treasurer/src/store/features/organizationSlice.ts`
- Modify: `treasurer/src/store/index.ts`

**Step 1: Create the organization slice**

```typescript
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { OrganizationSummary } from '@/types'
import { organizationApi } from '@/lib/api/organizations'
import { ApiError } from '@/lib/api'

interface OrganizationState {
  organizations: OrganizationSummary[]
  currentOrganization: OrganizationSummary | null
  isLoading: boolean
  error: string | null
}

const initialState: OrganizationState = {
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null,
}

export const switchOrganization = createAsyncThunk(
  'organization/switch',
  async (orgId: string, { getState, rejectWithValue }) => {
    try {
      await organizationApi.switch(orgId)
      const state = getState() as RootState
      const org = state.organization.organizations.find((o) => o.id === orgId)
      return org || null
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to switch organization')
    }
  }
)

export const createOrganization = createAsyncThunk(
  'organization/create',
  async (name: string, { rejectWithValue }) => {
    try {
      const response = await organizationApi.create({ name })
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to create organization')
    }
  }
)

export const leaveOrganization = createAsyncThunk(
  'organization/leave',
  async (orgId: string, { rejectWithValue }) => {
    try {
      await organizationApi.leave(orgId)
      return orgId
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to leave organization')
    }
  }
)

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setOrganizations: (
      state,
      action: PayloadAction<{
        organizations: OrganizationSummary[]
        currentOrganization: OrganizationSummary | null
      }>
    ) => {
      state.organizations = action.payload.organizations
      state.currentOrganization = action.payload.currentOrganization
    },
    clearOrganizations: (state) => {
      state.organizations = []
      state.currentOrganization = null
      state.error = null
    },
    clearOrgError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Switch organization
      .addCase(switchOrganization.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(switchOrganization.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentOrganization = action.payload
      })
      .addCase(switchOrganization.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create organization
      .addCase(createOrganization.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.isLoading = false
        state.organizations.push(action.payload)
        state.currentOrganization = action.payload
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Leave organization
      .addCase(leaveOrganization.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(leaveOrganization.fulfilled, (state, action) => {
        state.isLoading = false
        state.organizations = state.organizations.filter((o) => o.id !== action.payload)
        if (state.currentOrganization?.id === action.payload) {
          state.currentOrganization = state.organizations[0] || null
        }
      })
      .addCase(leaveOrganization.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setOrganizations, clearOrganizations, clearOrgError } = organizationSlice.actions

// Selectors
export const selectOrganizations = (state: RootState) => state.organization.organizations
export const selectCurrentOrganization = (state: RootState) => state.organization.currentOrganization
export const selectOrgLoading = (state: RootState) => state.organization.isLoading
export const selectOrgError = (state: RootState) => state.organization.error
export const selectIsOrgOwner = (state: RootState) =>
  state.organization.currentOrganization?.role === 'OWNER'
export const selectIsOrgAdmin = (state: RootState) =>
  state.organization.currentOrganization?.role === 'OWNER' ||
  state.organization.currentOrganization?.role === 'ADMIN'
export const selectHasOrganizations = (state: RootState) =>
  state.organization.organizations.length > 0

export default organizationSlice.reducer
```

**Step 2: Register slice in store**

Update `treasurer/src/store/index.ts`:

```typescript
import organizationReducer from './features/organizationSlice'

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    auth: authReducer,
    organization: organizationReducer,
  },
})
```

**Step 3: Commit**

```bash
git add treasurer/src/store/
git commit -m "feat(store): add organization Redux slice"
```

---

### Task 11.2: Update Auth Slice Integration

**Files:**
- Modify: `treasurer/src/store/features/authSlice.ts`

**Step 1: Update initializeAuth to populate organizations**

Import and dispatch setOrganizations:

```typescript
import { setOrganizations, clearOrganizations } from './organizationSlice'

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    const token = getAuthToken()
    if (!token) {
      return null
    }

    try {
      const response = await authApi.getMe()
      dispatch(setOrganizations({
        organizations: response.data.organizations,
        currentOrganization: response.data.currentOrganization,
      }))
      return { user: response.data.user, token }
    } catch (error) {
      clearAuthToken()
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Session expired')
    }
  }
)
```

**Step 2: Update login thunk**

```typescript
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginInput, { dispatch, rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      setAuthToken(response.data.token)
      // Fetch full user data with organizations
      const meResponse = await authApi.getMe()
      dispatch(setOrganizations({
        organizations: meResponse.data.organizations,
        currentOrganization: meResponse.data.currentOrganization,
      }))
      return { user: meResponse.data.user, token: response.data.token }
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Login failed')
    }
  }
)
```

**Step 3: Update register thunk**

```typescript
export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterInput, { dispatch, rejectWithValue }) => {
    try {
      const response = await authApi.register(data)
      setAuthToken(response.data.token)
      // New users have no organizations yet
      dispatch(setOrganizations({
        organizations: [],
        currentOrganization: null,
      }))
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Registration failed')
    }
  }
)
```

**Step 4: Update logout action**

```typescript
logout: (state) => {
  state.user = null
  state.token = null
  state.isAuthenticated = false
  state.error = null
  clearAuthToken()
},
```

And in App.tsx or wherever logout is dispatched, also dispatch `clearOrganizations()`.

**Step 5: Commit**

```bash
git add treasurer/src/store/features/authSlice.ts
git commit -m "feat(auth): integrate organization state with auth flow"
```

---

## Phase 12: Frontend Components

### Task 12.1: Create Organization Switcher Component

**Files:**
- Create: `treasurer/src/components/organization/OrganizationSwitcher.tsx`

**Step 1: Create the component**

```typescript
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectOrganizations,
  selectCurrentOrganization,
  switchOrganization,
} from '@/store/features/organizationSlice'

export function OrganizationSwitcher() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const organizations = useAppSelector(selectOrganizations)
  const currentOrg = useAppSelector(selectCurrentOrganization)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrg?.id) {
      setIsOpen(false)
      return
    }
    await dispatch(switchOrganization(orgId))
    setIsOpen(false)
    navigate(`/organizations/${orgId}/dashboard`)
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    navigate('/organizations/new')
  }

  if (!currentOrg) {
    return (
      <button
        onClick={() => navigate('/organizations/new')}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Create Organization
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="max-w-[150px] truncate">{currentOrg.name}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                {org.id === currentOrg.id && (
                  <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {org.id !== currentOrg.id && <span className="w-4" />}
                <span className="truncate">{org.name}</span>
                <span className="ml-auto text-xs text-gray-400">{org.role}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200">
            <button
              onClick={handleCreateNew}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Organization
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create index export**

Create `treasurer/src/components/organization/index.ts`:

```typescript
export { OrganizationSwitcher } from './OrganizationSwitcher'
```

**Step 3: Commit**

```bash
git add treasurer/src/components/organization/
git commit -m "feat(ui): add OrganizationSwitcher component"
```

---

### Task 12.2: Update Header with Organization Switcher

**Files:**
- Modify: `treasurer/src/components/layout/Header.tsx`

**Step 1: Add OrganizationSwitcher to Header**

```typescript
import { OrganizationSwitcher } from '@/components/organization'

// Inside the authenticated section, after Logo and before nav links:
{isAuthenticated && <OrganizationSwitcher />}
```

**Step 2: Commit**

```bash
git add treasurer/src/components/layout/Header.tsx
git commit -m "feat(ui): integrate OrganizationSwitcher into Header"
```

---

### Task 12.3: Create CreateOrganization Page

**Files:**
- Create: `treasurer/src/pages/CreateOrganizationPage.tsx`

**Step 1: Create the page component**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createOrganization, selectOrgLoading, selectOrgError } from '@/store/features/organizationSlice'
import { Button, Input, Label, Card } from '@/components/ui'

export function CreateOrganizationPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isLoading = useAppSelector(selectOrgLoading)
  const error = useAppSelector(selectOrgError)
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const result = await dispatch(createOrganization(name.trim()))
    if (createOrganization.fulfilled.match(result)) {
      navigate(`/organizations/${result.payload.id}/dashboard`)
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Create Organization</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
              required
              maxLength={100}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" disabled={isLoading || !name.trim()} className="w-full">
            {isLoading ? 'Creating...' : 'Create Organization'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

**Step 2: Export from pages/index.ts**

Add to `treasurer/src/pages/index.ts`:

```typescript
export { CreateOrganizationPage } from './CreateOrganizationPage'
```

**Step 3: Commit**

```bash
git add treasurer/src/pages/CreateOrganizationPage.tsx treasurer/src/pages/index.ts
git commit -m "feat(ui): add CreateOrganizationPage"
```

---

### Task 12.4: Create Organization Dashboard Page

**Files:**
- Create: `treasurer/src/pages/OrganizationDashboardPage.tsx`

**Step 1: Create the page component**

```typescript
import { useParams } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentOrganization } from '@/store/features/organizationSlice'
import { Card } from '@/components/ui'

export function OrganizationDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const currentOrg = useAppSelector(selectCurrentOrganization)

  return (
    <div className="mx-auto max-w-7xl py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        {currentOrg?.name || 'Organization'} Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Welcome</h2>
          <p className="text-gray-600">
            This is your organization dashboard. Financial features will be added here.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Your Role</h2>
          <p className="text-gray-600">
            You are a <span className="font-medium">{currentOrg?.role}</span> in this organization.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Organization ID</h2>
          <p className="font-mono text-sm text-gray-500">{orgId}</p>
        </Card>
      </div>
    </div>
  )
}
```

**Step 2: Export from pages/index.ts**

Add to exports:

```typescript
export { OrganizationDashboardPage } from './OrganizationDashboardPage'
```

**Step 3: Commit**

```bash
git add treasurer/src/pages/OrganizationDashboardPage.tsx treasurer/src/pages/index.ts
git commit -m "feat(ui): add OrganizationDashboardPage"
```

---

## Phase 13: Frontend Routing

### Task 13.1: Update App Routing

**Files:**
- Modify: `treasurer/src/App.tsx`
- Create: `treasurer/src/components/auth/RequireOrganization.tsx`

**Step 1: Create RequireOrganization guard**

```typescript
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectHasOrganizations, selectCurrentOrganization } from '@/store/features/organizationSlice'
import { selectAuthInitialized } from '@/store/features/authSlice'

interface RequireOrganizationProps {
  children: React.ReactNode
}

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const isInitialized = useAppSelector(selectAuthInitialized)
  const hasOrgs = useAppSelector(selectHasOrganizations)
  const currentOrg = useAppSelector(selectCurrentOrganization)

  if (!isInitialized) {
    return null // or loading spinner
  }

  if (!hasOrgs) {
    return <Navigate to="/organizations/new" replace />
  }

  // If on a generic protected route, redirect to current org dashboard
  if (currentOrg && window.location.pathname === '/dashboard') {
    return <Navigate to={`/organizations/${currentOrg.id}/dashboard`} replace />
  }

  return <>{children}</>
}
```

**Step 2: Update App.tsx routes**

```typescript
import { RequireOrganization } from '@/components/auth/RequireOrganization'
import {
  HomePage,
  DashboardPage,
  NotFoundPage,
  LoginPage,
  RegisterPage,
  CreateOrganizationPage,
  OrganizationDashboardPage,
} from '@/pages'

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    void dispatch(initializeAuth())
  }, [dispatch])

  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Organization creation - requires auth but not org */}
        <Route
          path="/organizations/new"
          element={
            <ProtectedRoute>
              <CreateOrganizationPage />
            </ProtectedRoute>
          }
        />

        {/* Organization-scoped routes */}
        <Route
          path="/organizations/:orgId/dashboard"
          element={
            <ProtectedRoute>
              <RequireOrganization>
                <OrganizationDashboardPage />
              </RequireOrganization>
            </ProtectedRoute>
          }
        />

        {/* Legacy dashboard redirect */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RequireOrganization>
                <DashboardPage />
              </RequireOrganization>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
```

**Step 3: Commit**

```bash
git add treasurer/src/App.tsx treasurer/src/components/auth/RequireOrganization.tsx
git commit -m "feat(routing): add organization-scoped routes"
```

---

## Phase 14: Final Integration

### Task 14.1: Update Header Navigation Links

**Files:**
- Modify: `treasurer/src/components/layout/Header.tsx`

**Step 1: Update dashboard link to be org-aware**

```typescript
import { selectCurrentOrganization } from '@/store/features/organizationSlice'

// Inside Header component:
const currentOrg = useAppSelector(selectCurrentOrganization)

// Update the Dashboard NavLink:
<NavLink
  to={currentOrg ? `/organizations/${currentOrg.id}/dashboard` : '/organizations/new'}
  className={({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
    }`
  }
>
  Dashboard
</NavLink>
```

**Step 2: Clear organizations on logout**

```typescript
import { clearOrganizations } from '@/store/features/organizationSlice'

const handleLogout = () => {
  dispatch(logout())
  dispatch(clearOrganizations())
  navigate('/')
}
```

**Step 3: Commit**

```bash
git add treasurer/src/components/layout/Header.tsx
git commit -m "feat(ui): update Header for organization-aware navigation"
```

---

### Task 14.2: Run Full Test Suite

**Step 1: Run backend tests**

Run: `cd treasurer-api && pnpm test -- --run`

**Step 2: Run frontend tests**

Run: `cd treasurer && pnpm test -- --run`

**Step 3: Run linting**

Run: `cd treasurer-api && pnpm lint && cd ../treasurer && pnpm lint`

**Step 4: Run type checking**

Run: `cd treasurer && pnpm type-check`

**Step 5: Fix any issues found**

**Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify all tests pass for multi-organization feature"
```

---

## Summary

This implementation plan covers:

1. **Backend (Tasks 1-8):**
   - Database schema with Organization and OrganizationMember models
   - Organization service with CRUD and member management
   - Authorization middleware (requireOrgMembership, requireOrgRole)
   - 11 new API endpoints for organizations
   - Enhanced /auth/me with organization context

2. **Frontend (Tasks 9-14):**
   - Organization types and API client
   - Organization Redux slice with switch/create/leave actions
   - OrganizationSwitcher dropdown component
   - CreateOrganization and OrganizationDashboard pages
   - Organization-scoped routing with guards

**Estimated Tasks:** 14 main tasks with ~50 steps total
**Key Files Created:** ~15 new files
**Key Files Modified:** ~10 existing files
