import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { HierarchicalCategory, TransactionCategory } from '@/types'
import {
  hierarchicalCategoryApi,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/lib/api/categories'
import { ApiError } from '@/lib/api'

/**
 * Tree node representation for category display.
 */
export interface CategoryTreeNode extends HierarchicalCategory {
  depth: number
  hasChildren: boolean
  isExpanded?: boolean
}

/**
 * State shape for category management.
 */
interface CategoryState {
  /** Flat list of all categories */
  categories: HierarchicalCategory[]
  /** Tree structure of categories (parent categories with children) */
  categoryTree: HierarchicalCategory[]
  /** Parent categories (top-level only) */
  parentCategories: HierarchicalCategory[]
  /** Currently selected category for editing */
  selectedCategory: HierarchicalCategory | null
  /** Loading state */
  isLoading: boolean
  /** Error message if any operation failed */
  error: string | null
  /** Cache timestamp for tree data */
  treeCacheTimestamp: number | null
}

const initialState: CategoryState = {
  categories: [],
  categoryTree: [],
  parentCategories: [],
  selectedCategory: null,
  isLoading: false,
  error: null,
  treeCacheTimestamp: null,
}

/** Cache TTL in milliseconds (10 minutes) */
const TREE_CACHE_TTL = 10 * 60 * 1000

/**
 * Fetch all categories as a flat list.
 */
export const fetchCategories = createAsyncThunk(
  'category/fetchAll',
  async (
    { orgId, search, limit }: { orgId: string; search?: string; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await hierarchicalCategoryApi.listFlat(orgId, search, limit)
      return response.data.categories
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch categories')
    }
  }
)

/**
 * Fetch categories as a hierarchical tree.
 */
export const fetchCategoryTree = createAsyncThunk(
  'category/fetchTree',
  async (
    { orgId, forceRefresh = false }: { orgId: string; forceRefresh?: boolean },
    { getState, rejectWithValue }
  ) => {
    try {
      // Check cache validity if not forcing refresh
      const state = getState() as RootState
      if (
        !forceRefresh &&
        state.category.treeCacheTimestamp &&
        Date.now() - state.category.treeCacheTimestamp < TREE_CACHE_TTL &&
        state.category.categoryTree.length > 0
      ) {
        return { categories: state.category.categoryTree, fromCache: true }
      }

      const response = await hierarchicalCategoryApi.listTree(orgId)
      return { categories: response.data.categories, fromCache: false }
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch category tree')
    }
  }
)

/**
 * Fetch only parent (top-level) categories.
 */
export const fetchParentCategories = createAsyncThunk(
  'category/fetchParents',
  async ({ orgId }: { orgId: string }, { rejectWithValue }) => {
    try {
      const response = await hierarchicalCategoryApi.listParents(orgId)
      return response.data.categories
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch parent categories')
    }
  }
)

/**
 * Fetch child categories for a parent.
 */
export const fetchChildCategories = createAsyncThunk(
  'category/fetchChildren',
  async (
    { orgId, parentId }: { orgId: string; parentId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await hierarchicalCategoryApi.listChildren(orgId, parentId)
      return { parentId, children: response.data.categories }
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch child categories')
    }
  }
)

/**
 * Create a new category.
 */
export const createCategory = createAsyncThunk(
  'category/create',
  async (
    { orgId, data }: { orgId: string; data: CreateCategoryInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await hierarchicalCategoryApi.create(orgId, data)
      return response.data.category
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to create category')
    }
  }
)

/**
 * Update an existing category.
 */
export const updateCategory = createAsyncThunk(
  'category/update',
  async (
    { orgId, categoryId, data }: { orgId: string; categoryId: string; data: UpdateCategoryInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await hierarchicalCategoryApi.update(orgId, categoryId, data)
      return response.data.category
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to update category')
    }
  }
)

/**
 * Delete a category.
 */
export const deleteCategory = createAsyncThunk(
  'category/delete',
  async (
    { orgId, categoryId }: { orgId: string; categoryId: string },
    { rejectWithValue }
  ) => {
    try {
      await hierarchicalCategoryApi.delete(orgId, categoryId)
      return categoryId
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to delete category')
    }
  }
)

/**
 * Build a flat list of categories with depth information for tree display.
 */
function flattenCategoryTree(
  categories: HierarchicalCategory[],
  depth = 0
): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = []

  for (const category of categories) {
    result.push({
      ...category,
      depth,
      hasChildren: Boolean(category.children && category.children.length > 0),
    })

    if (category.children && category.children.length > 0) {
      result.push(...flattenCategoryTree(category.children, depth + 1))
    }
  }

  return result
}

/**
 * Get the full path of a category (e.g., "Fundraiser > Spring Gala").
 */
export function getCategoryPath(
  category: HierarchicalCategory,
  allCategories: HierarchicalCategory[]
): string {
  const path: string[] = [category.name]
  let current = category

  while (current.parentId) {
    const parent = allCategories.find((c) => c.id === current.parentId)
    if (parent) {
      path.unshift(parent.name)
      current = parent
    } else {
      break
    }
  }

  return path.join(' > ')
}

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    /**
     * Select a category for viewing/editing.
     */
    setSelectedCategory: (state, action: PayloadAction<HierarchicalCategory | null>) => {
      state.selectedCategory = action.payload
    },

    /**
     * Clear the category list.
     */
    clearCategories: (state) => {
      state.categories = []
      state.categoryTree = []
      state.parentCategories = []
      state.selectedCategory = null
      state.error = null
      state.treeCacheTimestamp = null
    },

    /**
     * Clear category error.
     */
    clearCategoryError: (state) => {
      state.error = null
    },

    /**
     * Invalidate the tree cache.
     */
    invalidateTreeCache: (state) => {
      state.treeCacheTimestamp = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch flat categories
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false
        // Convert TransactionCategory to HierarchicalCategory
        state.categories = action.payload.map((cat: TransactionCategory) => ({
          ...cat,
          parentId: null,
          parent: null,
          children: [],
        }))
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Fetch category tree
      .addCase(fetchCategoryTree.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCategoryTree.fulfilled, (state, action) => {
        state.isLoading = false
        if (!action.payload.fromCache) {
          state.categoryTree = action.payload.categories
          state.treeCacheTimestamp = Date.now()
        }
      })
      .addCase(fetchCategoryTree.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Fetch parent categories
      .addCase(fetchParentCategories.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchParentCategories.fulfilled, (state, action) => {
        state.isLoading = false
        state.parentCategories = action.payload
      })
      .addCase(fetchParentCategories.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Fetch child categories
      .addCase(fetchChildCategories.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchChildCategories.fulfilled, (state, action) => {
        state.isLoading = false
        // Update the parent in the tree with its children
        const updateChildren = (categories: HierarchicalCategory[]): HierarchicalCategory[] => {
          return categories.map((cat) => {
            if (cat.id === action.payload.parentId) {
              return { ...cat, children: action.payload.children }
            }
            if (cat.children && cat.children.length > 0) {
              return { ...cat, children: updateChildren(cat.children) }
            }
            return cat
          })
        }
        state.categoryTree = updateChildren(state.categoryTree)
      })
      .addCase(fetchChildCategories.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Create category
      .addCase(createCategory.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.isLoading = false
        state.categories.unshift(action.payload)

        // Add to tree - if no parent, add to root
        if (!action.payload.parentId) {
          state.categoryTree.unshift(action.payload)
          state.parentCategories.unshift(action.payload)
        } else {
          // Add as child of parent
          const addToParent = (categories: HierarchicalCategory[]): HierarchicalCategory[] => {
            return categories.map((cat) => {
              if (cat.id === action.payload.parentId) {
                return {
                  ...cat,
                  children: [...(cat.children || []), action.payload],
                }
              }
              if (cat.children && cat.children.length > 0) {
                return { ...cat, children: addToParent(cat.children) }
              }
              return cat
            })
          }
          state.categoryTree = addToParent(state.categoryTree)
        }

        // Invalidate cache
        state.treeCacheTimestamp = null
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Update category
      .addCase(updateCategory.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.isLoading = false

        // Update in flat list
        const index = state.categories.findIndex((c) => c.id === action.payload.id)
        if (index !== -1) {
          state.categories[index] = action.payload
        }

        // Update in parent categories if applicable
        const parentIndex = state.parentCategories.findIndex((c) => c.id === action.payload.id)
        if (parentIndex !== -1) {
          state.parentCategories[parentIndex] = action.payload
        }

        // Update in tree
        const updateInTree = (categories: HierarchicalCategory[]): HierarchicalCategory[] => {
          return categories.map((cat) => {
            if (cat.id === action.payload.id) {
              return { ...action.payload, children: cat.children }
            }
            if (cat.children && cat.children.length > 0) {
              return { ...cat, children: updateInTree(cat.children) }
            }
            return cat
          })
        }
        state.categoryTree = updateInTree(state.categoryTree)

        if (state.selectedCategory?.id === action.payload.id) {
          state.selectedCategory = action.payload
        }

        // Invalidate cache
        state.treeCacheTimestamp = null
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Delete category
      .addCase(deleteCategory.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.isLoading = false

        // Remove from flat list
        state.categories = state.categories.filter((c) => c.id !== action.payload)

        // Remove from parent categories
        state.parentCategories = state.parentCategories.filter((c) => c.id !== action.payload)

        // Remove from tree
        const removeFromTree = (categories: HierarchicalCategory[]): HierarchicalCategory[] => {
          return categories
            .filter((cat) => cat.id !== action.payload)
            .map((cat) => {
              if (cat.children && cat.children.length > 0) {
                return { ...cat, children: removeFromTree(cat.children) }
              }
              return cat
            })
        }
        state.categoryTree = removeFromTree(state.categoryTree)

        if (state.selectedCategory?.id === action.payload) {
          state.selectedCategory = null
        }

        // Invalidate cache
        state.treeCacheTimestamp = null
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setSelectedCategory,
  clearCategories,
  clearCategoryError,
  invalidateTreeCache,
} = categorySlice.actions

// Selectors
export const selectAllCategories = (state: RootState) => state.category?.categories || []
export const selectCategoryTree = (state: RootState) => state.category?.categoryTree || []
export const selectParentCategories = (state: RootState) => state.category?.parentCategories || []
export const selectCurrentCategory = (state: RootState) => state.category?.selectedCategory || null
export const selectCategoryLoading = (state: RootState) => state.category?.isLoading || false
export const selectCategoryError = (state: RootState) => state.category?.error || null

/**
 * Select a category by ID from the flat list.
 */
export const selectCategoryById = (state: RootState, categoryId: string) =>
  state.category.categories.find((c) => c.id === categoryId)

/**
 * Get all categories as a flat list with depth information.
 */
export const selectFlattenedTree = (state: RootState): CategoryTreeNode[] =>
  flattenCategoryTree(state.category.categoryTree)

/**
 * Get children of a specific parent category.
 */
export const selectChildCategories = (state: RootState, parentId: string) => {
  const findChildren = (categories: HierarchicalCategory[]): HierarchicalCategory[] => {
    for (const cat of categories) {
      if (cat.id === parentId) {
        return cat.children || []
      }
      if (cat.children && cat.children.length > 0) {
        const found = findChildren(cat.children)
        if (found.length > 0) {
          return found
        }
      }
    }
    return []
  }
  return findChildren(state.category.categoryTree)
}

export { flattenCategoryTree }
export default categorySlice.reducer
