import { useCallback, useEffect, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'
import { VendorCard } from './VendorCard'
import { VendorForm, type VendorFormData } from './VendorForm'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  selectAllVendors,
  selectVendorTotal,
  selectVendorLoading,
  selectVendorError,
  clearVendorError,
} from '@/store/features/vendorSlice'
import { useDebounce } from '@/hooks'
import type { Vendor } from '@/types'

/**
 * Props for the VendorList component.
 */
interface VendorListProps {
  /** Organization ID */
  orgId: string
  /** Custom class name */
  className?: string
}

/**
 * Dialog mode for the vendor form.
 */
type DialogMode = 'closed' | 'create' | 'edit'

/**
 * Vendor management list component.
 * Displays all vendors with search, create, edit, and delete functionality.
 *
 * @example
 * ```tsx
 * <VendorList orgId={currentOrgId} />
 * ```
 */
export function VendorList({ orgId, className = '' }: VendorListProps) {
  const dispatch = useAppDispatch()
  const vendors = useAppSelector(selectAllVendors)
  const total = useAppSelector(selectVendorTotal)
  const isLoading = useAppSelector(selectVendorLoading)
  const error = useAppSelector(selectVendorError)

  const [search, setSearch] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode>('closed')
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  // Load vendors on mount and when search changes
  useEffect(() => {
    if (orgId) {
      void dispatch(
        fetchVendors({
          orgId,
          params: {
            search: debouncedSearch || undefined,
            limit: 50,
          },
        })
      )
    }
  }, [orgId, debouncedSearch, dispatch])

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearVendorError())
    }
  }, [dispatch])

  const handleOpenCreate = useCallback(() => {
    setEditingVendor(null)
    setFormError(null)
    setDialogMode('create')
  }, [])

  const handleOpenEdit = useCallback((vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormError(null)
    setDialogMode('edit')
  }, [])

  const handleCloseDialog = useCallback(() => {
    setDialogMode('closed')
    setEditingVendor(null)
    setFormError(null)
  }, [])

  const handleSubmit = useCallback(
    (data: VendorFormData) => {
      setFormError(null)

      const doSubmit = async () => {
        try {
          if (dialogMode === 'create') {
            await dispatch(
              createVendor({
                orgId,
                data: {
                  name: data.name,
                  description: data.description || undefined,
                  defaultCategoryId: data.defaultCategoryId || undefined,
                },
              })
            ).unwrap()
          } else if (dialogMode === 'edit' && editingVendor) {
            await dispatch(
              updateVendor({
                orgId,
                vendorId: editingVendor.id,
                data: {
                  name: data.name,
                  description: data.description || undefined,
                  defaultCategoryId: data.defaultCategoryId,
                },
              })
            ).unwrap()
          }

          handleCloseDialog()
        } catch (err) {
          setFormError(typeof err === 'string' ? err : 'An error occurred')
        }
      }

      void doSubmit()
    },
    [orgId, dialogMode, editingVendor, dispatch, handleCloseDialog]
  )

  const handleDelete = useCallback(
    (vendor: Vendor) => {
      if (!window.confirm(`Are you sure you want to delete "${vendor.name}"?`)) {
        return
      }

      setDeletingVendorId(vendor.id)

      dispatch(deleteVendor({ orgId, vendorId: vendor.id }))
        .unwrap()
        .catch(() => {
          // Error is handled by the slice
        })
        .finally(() => {
          setDeletingVendorId(null)
        })
    },
    [orgId, dispatch]
  )

  return (
    <div className={className}>
      {/* Header with search and create */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vendors</h2>
          <p className="text-sm text-gray-500">
            {total} vendor{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Input
              type="search"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
              aria-label="Search vendors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>

          {/* Create button */}
          <Button onClick={handleOpenCreate}>
            <svg
              className="-ml-0.5 mr-1.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && vendors.length === 0 && (
        <div className="flex justify-center py-12">
          <svg
            className="h-8 w-8 animate-spin text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && vendors.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No vendors yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search
              ? 'No vendors match your search criteria.'
              : 'Get started by adding your first vendor.'}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate} className="mt-4">
              Add Vendor
            </Button>
          )}
        </div>
      )}

      {/* Vendor list */}
      {vendors.length > 0 && (
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              isDeleting={deletingVendorId === vendor.id}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogMode !== 'closed' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCloseDialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-dialog-title"
        >
          <div
            className="mx-4 w-full max-w-lg"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Card>
              <CardHeader>
                <CardTitle>
                  <span id="vendor-dialog-title">
                    {dialogMode === 'create' ? 'Add New Vendor' : 'Edit Vendor'}
                  </span>
                </CardTitle>
              </CardHeader>
            <CardContent>
              <VendorForm
                orgId={orgId}
                vendor={editingVendor}
                onSubmit={handleSubmit}
                onCancel={handleCloseDialog}
                isLoading={isLoading}
                error={formError}
              />
            </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
