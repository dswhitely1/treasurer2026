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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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

export default CreateOrganizationPage
