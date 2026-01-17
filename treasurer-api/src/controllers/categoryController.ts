import type { RequestHandler } from 'express'
import { getOrganizationCategories } from '../services/categoryService.js'
import { sendSuccess } from '../utils/response.js'
import type { CategoryQueryDto } from '../schemas/category.js'

export const list: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as CategoryQueryDto
    const categories = await getOrganizationCategories(
      req.params.orgId as string,
      query
    )
    sendSuccess(res, { categories })
  } catch (error) {
    next(error)
  }
}
