# Forms Reference

## Contents
- React Hook Form Setup
- Zod Schema Integration
- Form Patterns in This Codebase
- Form Anti-Patterns

## React Hook Form Setup

This codebase uses React Hook Form with Zod validation. See the **zod** skill for schema patterns.

### Basic Form Pattern

```typescript
// treasurer/src/pages/LoginPage.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    await dispatch(loginThunk(data))
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('email')}
        type="email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        type="password"
        error={errors.password?.message}
      />
      <Button type="submit" isLoading={isSubmitting}>
        Login
      </Button>
    </form>
  )
}
```

### Zod Schema

```typescript
// treasurer/src/lib/validations/auth.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>
```

## Form Patterns in This Codebase

### Transaction Form with Controlled Decimal Input

```typescript
// treasurer/src/components/transactions/TransactionForm.tsx
import { Controller, useForm } from 'react-hook-form'

export function TransactionForm({ onSubmit, defaultValues }: Props) {
  const { control, register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('description')} error={errors.description?.message} />
      
      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <CurrencyInput
            value={field.value}
            onValueChange={(value) => field.onChange(value)}
            error={errors.amount?.message}
          />
        )}
      />

      <Controller
        name="date"
        control={control}
        render={({ field }) => (
          <DatePicker
            selected={field.value}
            onChange={field.onChange}
            error={errors.date?.message}
          />
        )}
      />
    </form>
  )
}
```

### Form with Server Errors

```typescript
function AccountForm() {
  const { setError, ...form } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  })

  const onSubmit = async (data: AccountFormData) => {
    try {
      await createAccount(data).unwrap()
    } catch (error) {
      if (error.status === 409) {
        setError('name', { message: 'Account name already exists' })
      }
    }
  }
}
```

### Async Default Values

```typescript
function EditTransactionForm({ id }: Props) {
  const { data: transaction, isLoading } = useGetTransactionQuery(id)

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    values: transaction, // Updates form when data loads
  })

  if (isLoading) return <Spinner />

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

## Form Anti-Patterns

### WARNING: Uncontrolled to Controlled Switch

**The Problem:**

```typescript
// BAD - Switches from uncontrolled to controlled
const [value, setValue] = useState() // undefined initially

<Input value={value} onChange={e => setValue(e.target.value)} />
```

**Why This Breaks:**
React warns about switching from uncontrolled to controlled input.

**The Fix:**

```typescript
// GOOD - Always controlled with initial value
const [value, setValue] = useState('')

<Input value={value} onChange={e => setValue(e.target.value)} />
```

### WARNING: Form State in Redux

**The Problem:**

```typescript
// BAD - Form state in global store
dispatch(setFormField({ field: 'email', value: e.target.value }))
```

**Why This Breaks:**
1. Unnecessary re-renders across app
2. Form state is ephemeral, not global
3. Bloats Redux store

**The Fix:**

Use React Hook Form's local state. Only dispatch on submit.

### WARNING: Manual Validation Instead of Schema

**The Problem:**

```typescript
// BAD - Scattered validation logic
const validate = (data) => {
  const errors = {}
  if (!data.email) errors.email = 'Required'
  if (!data.email.includes('@')) errors.email = 'Invalid'
  if (data.password.length < 8) errors.password = 'Too short'
  return errors
}
```

**The Fix:**

Define schema once with Zod. See the **zod** skill.

```typescript
// GOOD - Single source of truth
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})