# Auth Pages Design

**Date:** 2026-01-15
**Status:** Approved
**Feature:** Login and Register pages consuming existing API endpoints

## Overview

Add Login and Register pages to the Treasurer frontend that consume the existing auth API endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/me`).

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Redux Toolkit + localStorage | Integrates with existing Redux setup, typed hooks ready |
| UI layout | Centered card | Leverages existing Card components, consistent with app |
| Form handling | React Hook Form + Zod | Scalable for future complex forms, matches backend validation |
| Post-auth redirect | Dashboard page | Simple, predictable behavior |
| Route protection | Redirect to login | Standard pattern, clear UX |

## Dependencies

```bash
pnpm add react-hook-form @hookform/resolvers zod
```

## File Structure

### New Files

```
treasurer/src/
├── components/
│   ├── ui/
│   │   ├── Input.tsx           # Form input with error states
│   │   └── Label.tsx           # Form label component
│   └── auth/
│       └── ProtectedRoute.tsx  # Route guard component
├── pages/
│   ├── LoginPage.tsx           # Login form page
│   └── RegisterPage.tsx        # Registration form page
├── store/
│   └── features/
│       └── authSlice.ts        # Redux auth state
└── lib/
    ├── validations/
    │   └── auth.ts             # Zod schemas for auth forms
    └── api/
        └── auth.ts             # Auth API functions
```

### Modified Files

- `components/ui/index.ts` - Export Input, Label
- `store/index.ts` - Add authReducer
- `lib/api.ts` - Add token handling
- `App.tsx` - Add routes + auth initialization
- `components/layout/Header.tsx` - Conditional auth links

## Component Specifications

### Auth State (Redux Slice)

```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Actions:**
- `setCredentials` - Stores user + token, saves to localStorage
- `logout` - Clears state and localStorage
- `setLoading` - Toggles loading state
- `setError` - Stores error messages
- `clearError` - Clears error state

**Selectors:**
- `selectCurrentUser`
- `selectIsAuthenticated`
- `selectAuthLoading`
- `selectAuthError`

**localStorage key:** `treasurer_token`

### Zod Validation Schemas

```typescript
// Login - simple validation
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register - matches backend requirements
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  name: z.string().max(100).optional(),
});
```

### Input Component

**Props:**
- Standard `InputHTMLAttributes`
- `error?: boolean` - Triggers error styling
- `errorMessage?: string` - Displayed below input

**Variants:**
- `default` - Standard border
- `error` - Red border when validation fails

### Page Layout

```
┌─────────────────────────────────┐
│         [Header/Nav]            │
├─────────────────────────────────┤
│                                 │
│     ┌───────────────────┐       │
│     │   Title           │       │
│     ├───────────────────┤       │
│     │ [API Error Alert] │       │
│     │                   │       │
│     │ Name (register)   │       │
│     │ [____________]    │       │
│     │                   │       │
│     │ Email             │       │
│     │ [____________]    │       │
│     │                   │       │
│     │ Password          │       │
│     │ [____________]    │       │
│     │                   │       │
│     │ [  Submit Button] │       │
│     │                   │       │
│     │ Link to other pg  │       │
│     └───────────────────┘       │
│                                 │
├─────────────────────────────────┤
│           [Footer]              │
└─────────────────────────────────┘
```

## Routing

```typescript
<Routes>
  <Route element={<RootLayout />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Routes>
```

### ProtectedRoute Behavior

1. Check `selectIsAuthenticated` from Redux
2. If authenticated, render children
3. If not authenticated, redirect to `/login`
4. Show loading spinner during initial token validation

### Header Updates

- **Logged out:** Show "Login" and "Register" links
- **Logged in:** Show "Dashboard" link and "Logout" button

## API Integration

### Token Handling in api.ts

- `setAuthToken(token)` - Store token for requests
- `getAuthToken()` - Retrieve current token
- Auto-attach `Authorization: Bearer <token>` header
- Handle 401 responses: clear auth state, redirect to login

### Auth API Functions

```typescript
export const authApi = {
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterInput) => api.post<AuthResponse>('/auth/register', data),
  getMe: () => api.get<MeResponse>('/auth/me'),
}
```

## Error Handling

- **Field errors:** Red text below affected input
- **API errors:** Alert box at top of form (e.g., "Email already registered")
- **Clear behavior:** Errors clear when user types in affected field

## Auth Flow

### Login
1. User enters email/password
2. Client-side Zod validation
3. Call `POST /api/auth/login`
4. On success: store credentials, redirect to `/dashboard`
5. On error: display message

### Register
1. User enters name (optional), email, password
2. Client-side Zod validation (strict password rules)
3. Call `POST /api/auth/register`
4. On success: store credentials, redirect to `/dashboard`
5. On error: display message

### App Initialization
1. Check localStorage for `treasurer_token`
2. If exists, call `GET /api/auth/me`
3. If valid: populate auth state
4. If invalid: clear token

### Logout
1. Dispatch `logout` action
2. Clear localStorage
3. Redirect to home page

## API Contract Reference

### POST /api/auth/login
**Request:** `{ email: string, password: string }`
**Response:** `{ success: true, data: { user, token }, message }`
**Errors:** 400 (validation), 401 (invalid credentials)

### POST /api/auth/register
**Request:** `{ email: string, password: string, name?: string }`
**Response:** `{ success: true, data: { user, token }, message }`
**Errors:** 400 (validation), 409 (email exists)

### GET /api/auth/me
**Headers:** `Authorization: Bearer <token>`
**Response:** `{ success: true, data: { user } }`
**Errors:** 401 (invalid/expired token)
