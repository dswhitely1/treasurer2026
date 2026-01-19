import { LRUCache } from "lru-cache";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import type {
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  MoveCategoryDto,
  DeleteCategoryDto,
} from "../schemas/category.js";

export interface CategoryInfo {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  path: string | null;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends CategoryInfo {
  children: CategoryTreeNode[];
}

export interface CategoryWithStats extends CategoryInfo {
  transactionCount: number;
  childCount: number;
}

const MAX_CATEGORY_DEPTH = 3;

// LRU cache for category trees (bounded implementation)
const categoryTreeCache = new LRUCache<string, CategoryTreeNode[]>({
  max: 1000, // Maximum 1000 organizations in cache
  ttl: 5 * 60 * 1000, // 5 minutes TTL
  updateAgeOnGet: true, // Update TTL on cache hit
  updateAgeOnHas: false,
});

function formatCategory(category: {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  path: string | null;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}): CategoryInfo {
  return {
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    depth: category.depth,
    path: category.path,
    isActive: category.isActive,
    organizationId: category.organizationId,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

/**
 * Calculate the depth of a category in the hierarchy
 * @param tx Optional transaction context for atomic operations
 */
async function calculateCategoryDepth(
  organizationId: string,
  parentId: string | null,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  if (!parentId) return 0;

  // Use transaction client if provided, otherwise use global prisma client
  const db = tx ?? prisma;

  const parent = await db.category.findFirst({
    where: {
      id: parentId,
      organizationId,
    },
  });

  if (!parent) {
    throw new AppError("Parent category not found", 404);
  }

  return parent.depth + 1;
}

/**
 * Check for circular references in category hierarchy
 */
async function detectCircularReference(
  categoryId: string,
  newParentId: string | null,
  organizationId: string,
): Promise<boolean> {
  if (!newParentId) return false;

  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === categoryId) {
      return true; // Circular reference detected
    }

    const parent: { parentId: string | null } | null =
      await prisma.category.findFirst({
        where: {
          id: currentId,
          organizationId,
        },
        select: { parentId: true },
      });

    currentId = parent?.parentId ?? null;
  }

  return false;
}

/**
 * Get all descendant IDs of a category
 */
async function getDescendantIds(
  categoryId: string,
  organizationId: string,
): Promise<string[]> {
  const descendants: string[] = [];
  const queue: string[] = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    const children = await prisma.category.findMany({
      where: {
        parentId: currentId,
        organizationId,
      },
      select: { id: true },
    });

    const childIds = children.map((c) => c.id);
    descendants.push(...childIds);
    queue.push(...childIds);
  }

  return descendants;
}

/**
 * Build category tree from flat list
 */
function buildCategoryTree(categories: CategoryInfo[]): CategoryTreeNode[] {
  const categoryMap = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Create nodes
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Build tree
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id);
    if (!node) return;

    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not in list, treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Invalidate category tree cache for an organization
 */
function invalidateCache(organizationId: string): void {
  categoryTreeCache.delete(organizationId);
}

/**
 * Create a new category
 */
export async function createCategory(
  organizationId: string,
  input: CreateCategoryDto,
): Promise<CategoryInfo> {
  // Validate parent exists and belongs to organization if provided
  if (input.parentId) {
    const parent = await prisma.category.findFirst({
      where: {
        id: input.parentId,
        organizationId,
      },
    });

    if (!parent) {
      throw new AppError("Parent category not found", 404);
    }
  }

  const depth = await calculateCategoryDepth(
    organizationId,
    input.parentId ?? null,
  );

  if (depth > MAX_CATEGORY_DEPTH) {
    throw new AppError(
      `Category depth cannot exceed ${String(MAX_CATEGORY_DEPTH)}`,
      400,
    );
  }

  // Check for duplicate category name at same level
  const duplicate = await prisma.category.findFirst({
    where: {
      organizationId,
      name: {
        equals: input.name,
        mode: "insensitive",
      },
      parentId: input.parentId ?? null,
    },
  });

  if (duplicate) {
    throw new AppError(
      "A category with this name already exists at this level",
      409,
    );
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      parentId: input.parentId ?? null,
      depth,
      organizationId,
    },
  });

  invalidateCache(organizationId);
  return formatCategory(category);
}

/**
 * Get organization categories with optional filtering
 */
export async function getOrganizationCategories(
  organizationId: string,
  query: CategoryQueryDto,
): Promise<CategoryInfo[]> {
  let categoryIds: string[] | undefined;

  // If filtering by parent and includeDescendants, get all descendant IDs
  if (query.parentId && query.includeDescendants === "true") {
    const descendants = await getDescendantIds(query.parentId, organizationId);
    categoryIds = [query.parentId, ...descendants];
  }

  const categories = await prisma.category.findMany({
    where: {
      organizationId,
      ...(query.search && {
        name: { contains: query.search, mode: "insensitive" },
      }),
      ...(query.parentId &&
        !categoryIds && {
          parentId: query.parentId,
        }),
      ...(categoryIds && {
        id: { in: categoryIds },
      }),
    },
    orderBy: [{ depth: "asc" }, { name: "asc" }],
    take: query.limit,
  });

  return categories.map(formatCategory);
}

/**
 * Get category tree for an organization
 */
export async function getCategoryTree(
  organizationId: string,
): Promise<CategoryTreeNode[]> {
  // Check cache first
  const cached = categoryTreeCache.get(organizationId);
  if (cached) {
    return cached;
  }

  const categories = await prisma.category.findMany({
    where: { organizationId },
    orderBy: [{ depth: "asc" }, { name: "asc" }],
  });

  const tree = buildCategoryTree(categories.map(formatCategory));

  // Update cache (LRU will automatically evict oldest entries if max size reached)
  categoryTreeCache.set(organizationId, tree);

  return tree;
}

/**
 * Get a single category with statistics
 */
export async function getCategory(
  organizationId: string,
  categoryId: string,
): Promise<CategoryWithStats> {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
    },
    include: {
      _count: {
        select: {
          splits: true,
          children: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return {
    ...formatCategory(category),
    transactionCount: category._count.splits,
    childCount: category._count.children,
  };
}

/**
 * Update a category
 */
export async function updateCategory(
  organizationId: string,
  categoryId: string,
  input: UpdateCategoryDto,
): Promise<CategoryInfo> {
  const existing = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
    },
  });

  if (!existing) {
    throw new AppError("Category not found", 404);
  }

  // If changing parent, validate
  if (input.parentId !== undefined) {
    // Check for circular reference
    if (input.parentId) {
      const isCircular = await detectCircularReference(
        categoryId,
        input.parentId,
        organizationId,
      );
      if (isCircular) {
        throw new AppError("Cannot create circular category reference", 400);
      }
    }

    // Calculate new depth
    const newDepth = await calculateCategoryDepth(
      organizationId,
      input.parentId,
    );
    if (newDepth > MAX_CATEGORY_DEPTH) {
      throw new AppError(
        `Category depth cannot exceed ${String(MAX_CATEGORY_DEPTH)}`,
        400,
      );
    }

    // Check if any descendants would exceed max depth
    const descendants = await getDescendantIds(categoryId, organizationId);
    const maxDescendantDepth =
      descendants.length > 0
        ? await prisma.category.findFirst({
            where: { id: { in: descendants } },
            orderBy: { depth: "desc" },
            select: { depth: true },
          })
        : null;

    const depthDelta = newDepth - existing.depth;
    if (
      maxDescendantDepth &&
      maxDescendantDepth.depth + depthDelta > MAX_CATEGORY_DEPTH
    ) {
      throw new AppError(
        `Moving this category would cause descendants to exceed depth ${String(MAX_CATEGORY_DEPTH)}`,
        400,
      );
    }
  }

  // Check for duplicate name if name is changing
  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.category.findFirst({
      where: {
        organizationId,
        name: {
          equals: input.name,
          mode: "insensitive",
        },
        parentId:
          input.parentId !== undefined ? input.parentId : existing.parentId,
        id: { not: categoryId },
      },
    });

    if (duplicate) {
      throw new AppError(
        "A category with this name already exists at this level",
        409,
      );
    }
  }

  // Update category and descendants if parent changed
  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    // Capture parentId for type safety in transaction callback
    const newParentId = input.parentId;

    // Wrap entire operation in transaction to prevent race conditions
    const category = await prisma.$transaction(async (tx) => {
      // Calculate new depth within transaction to avoid race conditions
      const newDepth = await calculateCategoryDepth(
        organizationId,
        newParentId,
        tx,
      );
      const depthDelta = newDepth - existing.depth;

      // Update category
      const updatedCategory = await tx.category.update({
        where: { id: categoryId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          parentId: newParentId,
          depth: newDepth,
        },
      });

      // Update all descendants' depth atomically
      if (depthDelta !== 0) {
        const descendants = await getDescendantIds(categoryId, organizationId);
        if (descendants.length > 0) {
          // Update each descendant's depth incrementally
          for (const descendantId of descendants) {
            await tx.category.update({
              where: { id: descendantId },
              data: { depth: { increment: depthDelta } },
            });
          }
        }
      }

      return updatedCategory;
    });

    invalidateCache(organizationId);
    return formatCategory(category);
  }

  // Simple update without hierarchy changes
  const category = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
    },
  });

  invalidateCache(organizationId);
  return formatCategory(category);
}

/**
 * Move a category to a new parent
 */
export async function moveCategory(
  organizationId: string,
  categoryId: string,
  input: MoveCategoryDto,
): Promise<CategoryInfo> {
  return updateCategory(organizationId, categoryId, {
    parentId: input.newParentId,
  });
}

/**
 * Delete a category
 */
export async function deleteCategory(
  organizationId: string,
  categoryId: string,
  options: DeleteCategoryDto = {},
): Promise<void> {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
    },
    include: {
      _count: {
        select: {
          splits: true,
          children: true,
        },
      },
    },
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (category._count.splits > 0) {
    throw new AppError("Cannot delete category with transactions", 400);
  }

  if (category._count.children > 0) {
    if (options.moveChildrenTo) {
      // Validate target category exists
      const targetCategory = await prisma.category.findFirst({
        where: {
          id: options.moveChildrenTo,
          organizationId,
        },
      });

      if (!targetCategory) {
        throw new AppError("Target category not found", 404);
      }

      // Check if moving would create circular reference
      const descendants = await getDescendantIds(categoryId, organizationId);
      if (descendants.includes(options.moveChildrenTo)) {
        throw new AppError(
          "Cannot move children to a descendant category",
          400,
        );
      }

      // Wrap in transaction for atomic operation
      await prisma.$transaction(async (tx) => {
        // Move children to target category
        await tx.category.updateMany({
          where: {
            parentId: categoryId,
          },
          data: {
            parentId: options.moveChildrenTo,
          },
        });

        // Recalculate depths for moved children
        const movedChildren = await tx.category.findMany({
          where: { parentId: options.moveChildrenTo },
        });

        if (options.moveChildrenTo) {
          // Calculate depth within transaction to avoid race conditions
          const newDepth = await calculateCategoryDepth(
            organizationId,
            options.moveChildrenTo,
            tx,
          );

          for (const child of movedChildren) {
            await tx.category.update({
              where: { id: child.id },
              data: { depth: newDepth },
            });
          }
        }

        // Delete the category
        await tx.category.delete({
          where: { id: categoryId },
        });
      });
    } else if (options.moveChildrenTo === null) {
      // Wrap in transaction for atomic operation
      await prisma.$transaction(async (tx) => {
        // Move children to root level
        await tx.category.updateMany({
          where: {
            parentId: categoryId,
          },
          data: {
            parentId: null,
            depth: 0,
          },
        });

        // Delete the category
        await tx.category.delete({
          where: { id: categoryId },
        });
      });
    } else {
      throw new AppError(
        "Category has children. Specify moveChildrenTo to relocate them or set to null to move to root",
        400,
      );
    }
  } else {
    // No children, simple delete
    await prisma.category.delete({
      where: { id: categoryId },
    });
  }

  invalidateCache(organizationId);
}
