import { prisma } from '../config/database.js'
import type { CategoryQueryDto } from '../schemas/category.js'

export interface CategoryInfo {
  id: string
  name: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

function formatCategory(category: {
  id: string
  name: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
}): CategoryInfo {
  return {
    id: category.id,
    name: category.name,
    organizationId: category.organizationId,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export async function getOrganizationCategories(
  organizationId: string,
  query: CategoryQueryDto
): Promise<CategoryInfo[]> {
  const categories = await prisma.category.findMany({
    where: {
      organizationId,
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    },
    orderBy: { name: 'asc' },
    take: query.limit,
  })

  return categories.map(formatCategory)
}
