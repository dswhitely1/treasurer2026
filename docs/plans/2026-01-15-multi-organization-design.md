# Multi-Organization Feature Design

**Date:** 2026-01-15
**Status:** Approved
**Author:** Claude Code + User Collaboration

## Overview

Enable authenticated users to belong to multiple organizations, create new organizations, and switch between them when managing financial data. Each organization has its own dashboard and data scope.

## Requirements

### Functional Requirements

- Users can create new organizations
- Users can belong to multiple organizations with different roles
- Users can switch between organizations via header dropdown
- Organization context persists across sessions (last-used)
- Organization owners can manage members (add, remove, change roles)
- All financial data is scoped to an organization

### Non-Functional Requirements

- Seamless organization switching without re-authentication
- Clear authorization boundaries between organizations
- Graceful handling of edge cases (deleted orgs, removed members)

## Database Schema

### New Models

```prisma
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

enum OrganizationRole {
  OWNER
  ADMIN
  MEMBER
}
```

### User Model Updates

```prisma
model User {
  // ... existing fields ...
  lastOrganizationId String? @map("last_organization_id")

  memberships OrganizationMember[]
}
```

### Design Decisions

- `OrganizationMember` join table enables many-to-many with per-org roles
- `lastOrganizationId` is not a foreign key to avoid constraint issues if org is deleted
- Cascade deletes clean up memberships automatically
- Unique constraint on `[userId, organizationId]` prevents duplicate memberships

## Role & Permission Model

### Roles

| Role | Description |
|------|-------------|
| OWNER | Full control, can delete org and manage all members |
| ADMIN | Can manage org settings and members (except role changes) |
| MEMBER | Read/write access to org data, no admin capabilities |

### Permission Matrix

| Action | OWNER | ADMIN | MEMBER |
|--------|-------|-------|--------|
| View organization details | Yes | Yes | Yes |
| Edit organization details | Yes | Yes | No |
| Delete organization | Yes | No | No |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes | No |
| Change member roles | Yes | No | No |
| View members list | Yes | Yes | Yes |
| Leave organization | Yes* | Yes | Yes |
| Access financial data | Yes | Yes | Yes |

*Owner can only leave if they transfer ownership first or there's another owner

## API Endpoints

### Organizations

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/api/organizations` | Create new organization | Authenticated |
| GET | `/api/organizations` | List user's organizations | Authenticated |
| GET | `/api/organizations/:orgId` | Get organization details | Member |
| PATCH | `/api/organizations/:orgId` | Update organization | Owner, Admin |
| DELETE | `/api/organizations/:orgId` | Delete organization | Owner |

### Members

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| GET | `/api/organizations/:orgId/members` | List members | Member |
| POST | `/api/organizations/:orgId/members` | Add member by email | Owner, Admin |
| PATCH | `/api/organizations/:orgId/members/:userId` | Change member role | Owner |
| DELETE | `/api/organizations/:orgId/members/:userId` | Remove member | Owner, Admin |

### User Context

| Method | Endpoint | Description | Authorization |
|--------|----------|-------------|---------------|
| POST | `/api/organizations/:orgId/switch` | Switch to organization | Member |
| DELETE | `/api/organizations/:orgId/leave` | Leave organization | Member |

### Enhanced Existing Endpoint

`GET /api/auth/me` response updated to include:

```typescript
{
  user: { id, email, name, role },
  organizations: [
    { id, name, role: "OWNER" },
    { id, name, role: "MEMBER" }
  ],
  currentOrganization: { id, name, role } | null
}
```

## Authentication & Authorization

### JWT Payload (Unchanged)

```typescript
interface JwtPayload {
  userId: string
  email: string
  role: string  // Global role (USER, ADMIN)
}
```

Organization context is NOT stored in JWT. Instead:
- Server fetches `lastOrganizationId` from User record when needed
- Allows organization switching without token refresh
- Simpler token management

### New Middleware

```typescript
// Verifies user is a member of :orgId param
requireOrgMembership(): RequestHandler

// Verifies user has specific role(s) in the organization
requireOrgRole(...roles: OrganizationRole[]): RequestHandler
```

### Usage Example

```typescript
// Any member can view
router.get('/:orgId/members',
  authenticate,
  requireOrgMembership(),
  listMembers
)

// Owner or admin only
router.post('/:orgId/members',
  authenticate,
  requireOrgRole('OWNER', 'ADMIN'),
  addMember
)
```

## Frontend Architecture

### State Management

New Redux slice: `organizationSlice.ts`

```typescript
interface OrganizationState {
  organizations: OrganizationSummary[]
  currentOrganization: OrganizationSummary | null
  isLoading: boolean
  error: string | null
}

interface OrganizationSummary {
  id: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}
```

### Selectors

```typescript
selectCurrentOrganization    // Current org or null
selectOrganizations          // All user's orgs
selectIsOrgOwner            // Is user owner of current org
selectIsOrgAdmin            // Is user owner or admin of current org
```

### Integration with Auth

- `initializeAuth` thunk populates organization state from `/api/auth/me`
- Logout clears organization state
- Organization list refreshed when membership changes

## UI Components

### Organization Switcher

Located in header, shows:
- Current organization name
- Dropdown with all user's organizations
- Checkmark next to current organization
- "Create New Organization" option at bottom

```
┌─────────────────────────────────────────────────┐
│  Logo    [Current Org Name ▼]        User Menu  │
└─────────────────────────────────────────────────┘
                    │
                    ▼
          ┌─────────────────────┐
          │ ✓ Acme Corp         │
          │   Smith Family      │
          │   Side Project LLC  │
          ├─────────────────────┤
          │ + Create New Org    │
          └─────────────────────┘
```

### New Components

- `OrganizationSwitcher` - Header dropdown
- `OrganizationSettings` - View/edit org details
- `OrganizationMembers` - Member management page
- `CreateOrganizationModal` - Create new organization form

### Routes

```
/organizations/new                    - Create organization
/organizations/:orgId/dashboard       - Organization dashboard
/organizations/:orgId/settings        - Organization settings
/organizations/:orgId/members         - Members management
```

All financial features nested under `/organizations/:orgId/...`

## Edge Cases & Error Handling

### First-Time User (No Organizations)

- After login, if user has no organizations → redirect to `/organizations/new`
- Cannot access other routes until they create or join an organization

### Last Organization Deleted/Left

- Clear `lastOrganizationId` on the user record
- On next request, pick first available organization
- If none available, redirect to create organization flow

### Owner Leaving Organization

- Cannot leave if sole owner
- Must transfer ownership first (promote another member to OWNER)
- Or delete the organization entirely
- API returns error: "Transfer ownership before leaving"

### Accessing Deleted/Unauthorized Organization

- Return 403: "You don't have access to this organization"
- Frontend redirects to user's current valid organization

### Member Adding Non-Existent User

- Return 404: "User not found. They must create an account first."
- No pending invitation system (MVP simplicity)

## Migration Strategy

1. Create `Organization` and `OrganizationMember` tables
2. Add `lastOrganizationId` column to `users` table
3. Existing users will have no organizations initially
4. On first login after migration, redirect to create organization

## Future Considerations

Not in scope for MVP, but worth noting:

- Email invitations for non-existent users
- Organization-scoped roles/permissions refinement
- Organization billing/subscription tiers
- Organization audit logs
- Transfer organization ownership UI
