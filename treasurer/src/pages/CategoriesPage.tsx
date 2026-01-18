import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { CategoryTree, CategoryForm } from '@/components/categories'
import { Card, Button } from '@/components/ui'
import {
  fetchCategoryTree,
  createCategory,
  updateCategory,
  selectCategoryTree,
  selectCategoryLoading,
  selectCategoryError,
} from '@/store/features/categorySlice'
import type { HierarchicalCategory } from '@/types'

export function CategoriesPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const dispatch = useAppDispatch()
  const categoryTree = useAppSelector(selectCategoryTree)
  const isLoading = useAppSelector(selectCategoryLoading)
  const error = useAppSelector(selectCategoryError)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<HierarchicalCategory | null>(null)

  useEffect(() => {
    if (orgId) {
      void dispatch(fetchCategoryTree({ orgId }))
    }
  }, [dispatch, orgId])

  const handleCreate = async (data: { name: string; parentId?: string | null }) => {
    if (!orgId) return

    const result = await dispatch(createCategory({ orgId, data }))
    if (createCategory.fulfilled.match(result)) {
      setShowCreateForm(false)
      void dispatch(fetchCategoryTree({ orgId }))
    }
  }

  const handleUpdate = async (categoryId: string, data: { name: string; parentId?: string | null }) => {
    if (!orgId) return

    const result = await dispatch(updateCategory({ orgId, categoryId, data }))
    if (updateCategory.fulfilled.match(result)) {
      setEditingCategory(null)
      void dispatch(fetchCategoryTree({ orgId }))
    }
  }

  return (
    <div className="mx-auto max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-gray-600">Organize your transactions with hierarchical categories</p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>Add Category</Button>
        )}
      </div>

      {/* Create Category Form */}
      {showCreateForm && orgId && (
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Create Category</h2>
          <CategoryForm
            orgId={orgId}
            onSubmit={(data) => {
              void handleCreate(data)
            }}
            onCancel={() => setShowCreateForm(false)}
            isLoading={isLoading}
            error={error}
          />
        </Card>
      )}

      {/* Edit Category Form */}
      {editingCategory && orgId && (
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Edit Category</h2>
          <CategoryForm
            orgId={orgId}
            category={editingCategory}
            onSubmit={(data) => {
              void handleUpdate(editingCategory.id, data)
            }}
            onCancel={() => setEditingCategory(null)}
            isLoading={isLoading}
            error={error}
          />
        </Card>
      )}

      {/* Category Tree */}
      {isLoading && categoryTree.length === 0 ? (
        <div className="text-center text-gray-500">Loading categories...</div>
      ) : categoryTree.length === 0 ? (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No categories yet</h3>
          <p className="mt-2 text-gray-600">Get started by creating your first category.</p>
          {!showCreateForm && (
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              Create First Category
            </Button>
          )}
        </Card>
      ) : orgId ? (
        <Card className="p-6">
          <CategoryTree
            orgId={orgId}
            onEdit={setEditingCategory}
            showActions
          />
        </Card>
      ) : null}
    </div>
  )
}

export default CategoriesPage
