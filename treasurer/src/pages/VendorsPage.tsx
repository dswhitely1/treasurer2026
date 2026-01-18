import { useParams } from 'react-router-dom'
import { VendorList } from '@/components/vendors'

export function VendorsPage() {
  const { orgId } = useParams<{ orgId: string }>()

  if (!orgId) {
    return (
      <div className="mx-auto max-w-7xl py-8">
        <p className="text-center text-gray-500">Organization not found</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl py-8">
      <VendorList orgId={orgId} />
    </div>
  )
}

export default VendorsPage
