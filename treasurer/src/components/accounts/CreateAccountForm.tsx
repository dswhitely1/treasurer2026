import { useState, type FormEvent } from 'react'
import { Button, Input, Label } from '@/components/ui'
import type { AccountType } from '@/types'

interface CreateAccountFormProps {
  isLoading?: boolean
  error?: string | null
  onSubmit: (data: CreateAccountData) => void
  onCancel?: () => void
}

export interface CreateAccountData {
  name: string
  description?: string
  institution?: string
  accountType: AccountType
  balance: number
  currency: string
}

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'CHECKING', label: 'Checking' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'OTHER', label: 'Other' },
]

export function CreateAccountForm({
  isLoading,
  error,
  onSubmit,
  onCancel,
}: CreateAccountFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [institution, setInstitution] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('CHECKING')
  const [balance, setBalance] = useState('0')
  const [currency, setCurrency] = useState('USD')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      description: description || undefined,
      institution: institution || undefined,
      accountType,
      balance: parseFloat(balance) || 0,
      currency,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div>
        <Label htmlFor="name" required>
          Account Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Main Checking Account"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="institution">Institution</Label>
        <Input
          id="institution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          placeholder="e.g., Chase Bank"
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="accountType">Account Type</Label>
        <select
          id="accountType"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value as AccountType)}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {accountTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="balance">Initial Balance</Label>
          <Input
            id="balance"
            type="number"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="USD"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description for this account"
          disabled={isLoading}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} disabled={!name.trim()}>
          Create Account
        </Button>
      </div>
    </form>
  )
}
