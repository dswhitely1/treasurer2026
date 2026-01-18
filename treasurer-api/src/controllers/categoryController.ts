import type { RequestHandler } from 'express'
import {
  createCategory,
  getOrganizationCategories,
  getCategoryTree,
  getCategory,
  updateCategory,
  moveCategory,
  deleteCategory,
} from '../services/categoryService.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  MoveCategoryDto,
  DeleteCategoryDto,
} from '../schemas/category.js'

/**
 * @openapi
 * /api/organizations/{orgId}/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error (max depth exceeded)
 *       404:
 *         description: Parent category not found
 *       409:
 *         description: Category with this name already exists at this level
 */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateCategoryDto
    const category = await createCategory(req.params.orgId as string, data)
    sendSuccess(res, { category }, 'Category created successfully', 201)
  } catch (error) {
    next(error)
  }
}

/**
 * @openapi
 * /api/organizations/{orgId}/categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories for an organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeDescendants
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as CategoryQueryDto
    const categories = await getOrganizationCategories(req.params.orgId as string, query)
    sendSuccess(res, { categories })
  } catch (error) {
    next(error)
  }
}

/**
 * @openapi
 * /api/organizations/{orgId}/categories/tree:
 *   get:
 *     tags: [Categories]
 *     summary: Get category hierarchy tree
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */
export const tree: RequestHandler = async (req, res, next) => {
  try {
    const categoryTree = await getCategoryTree(req.params.orgId as string)
    sendSuccess(res, { categories: categoryTree })
  } catch (error) {
    next(error)
  }
}

/**
 * @openapi
 * /api/organizations/{orgId}/categories/{categoryId}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
export const get: RequestHandler = async (req, res, next) => {
  try {
    const category = await getCategory(
      req.params.orgId as string,
      req.params.categoryId as string
    )
    sendSuccess(res, { category })
  } catch (error) {
    next(error)
  }
}

/**
 * @openapi
 * /api/organizations/{orgId}/categories/{categoryId}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error (circular reference, max depth)
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name conflict
 */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateCategoryDto
    const category = await updateCategory(
      req.params.orgId as string,
      req.params.categoryId as string,
      data
    )
    sendSuccess(res, { category }, 'Category updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * @openapi
 * /api/organizations/{orgId}/categories/{categoryId}/move:
 *   post:
 *     tags: [Categories]
 *     summary: Move a category to a new parent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newParentId
 *             properties:
 *               newParentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Category moved successfully
 *       400:
 *         description: Validation error (circular reference, max depth)
 *       404:
 *         description: Category not found
 */
export const move: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as MoveCategoryDto
    const category = await moveCategory(
      req.params.orgId as string,
      req.params.categoryId as string,
      data
    )
    sendSuccess(res, { category }, 'Category moved successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * @openapi
 * /api/organizations/{orgId}/categories/{categoryId}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category
 *     description: Cannot delete categories with transactions. Must specify where to move children.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moveChildrenTo:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Category ID to move children to, or null to move to root
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Category has transactions or children without moveChildrenTo
 *       404:
 *         description: Category not found
 */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const options = req.body as DeleteCategoryDto
    await deleteCategory(
      req.params.orgId as string,
      req.params.categoryId as string,
      options
    )
    sendSuccess(res, null, 'Category deleted successfully')
  } catch (error) {
    next(error)
  }
}
