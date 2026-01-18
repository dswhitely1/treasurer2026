import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import type {
  CreateVendorDto,
  UpdateVendorDto,
  VendorQueryDto,
  VendorSearchDto,
} from '../schemas/vendor.js'

export interface VendorInfo {
  id: string
  name: string
  description: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface VendorWithStats extends VendorInfo {
  transactionCount: number
}

function formatVendor(vendor: {
  id: string
  name: string
  description: string | null
  organizationId: string
  createdAt: Date
  updatedAt: Date
}): VendorInfo {
  return {
    id: vendor.id,
    name: vendor.name,
    description: vendor.description,
    organizationId: vendor.organizationId,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  }
}

/**
 * Create a new vendor for an organization
 * @throws {AppError} If vendor name already exists in organization
 */
export async function createVendor(
  organizationId: string,
  input: CreateVendorDto
): Promise<VendorInfo> {
  // Check for duplicate vendor name in organization
  const existing = await prisma.vendor.findFirst({
    where: {
      organizationId,
      name: {
        equals: input.name,
        mode: 'insensitive',
      },
    },
  })

  if (existing) {
    throw new AppError('A vendor with this name already exists', 409)
  }

  const vendor = await prisma.vendor.create({
    data: {
      name: input.name,
      description: input.description,
      organizationId,
    },
  })

  return formatVendor(vendor)
}

/**
 * Get all vendors for an organization with filtering and pagination
 */
export async function getOrganizationVendors(
  organizationId: string,
  query: VendorQueryDto
): Promise<{ vendors: VendorInfo[]; total: number }> {
  const where = {
    organizationId,
    ...(query.search && {
      name: { contains: query.search, mode: 'insensitive' as const },
    }),
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: { name: 'asc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.vendor.count({ where }),
  ])

  return {
    vendors: vendors.map(formatVendor),
    total,
  }
}

/**
 * Search vendors by name (autocomplete)
 * Optimized for quick search/typeahead functionality
 */
export async function searchVendors(
  organizationId: string,
  query: VendorSearchDto
): Promise<VendorInfo[]> {
  const vendors = await prisma.vendor.findMany({
    where: {
      organizationId,
      name: {
        contains: query.q,
        mode: 'insensitive',
      },
    },
    orderBy: { name: 'asc' },
    take: query.limit,
  })

  return vendors.map(formatVendor)
}

/**
 * Get a single vendor with transaction count
 */
export async function getVendor(
  organizationId: string,
  vendorId: string
): Promise<VendorWithStats> {
  const vendor = await prisma.vendor.findFirst({
    where: {
      id: vendorId,
      organizationId,
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  })

  if (!vendor) {
    throw new AppError('Vendor not found', 404)
  }

  return {
    ...formatVendor(vendor),
    transactionCount: vendor._count.transactions,
  }
}

/**
 * Update a vendor
 * @throws {AppError} If vendor not found or name conflict
 */
export async function updateVendor(
  organizationId: string,
  vendorId: string,
  input: UpdateVendorDto
): Promise<VendorInfo> {
  const existing = await prisma.vendor.findFirst({
    where: {
      id: vendorId,
      organizationId,
    },
  })

  if (!existing) {
    throw new AppError('Vendor not found', 404)
  }

  // Check for duplicate vendor name if name is being changed
  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.vendor.findFirst({
      where: {
        organizationId,
        name: {
          equals: input.name,
          mode: 'insensitive',
        },
        id: { not: vendorId },
      },
    })

    if (duplicate) {
      throw new AppError('A vendor with this name already exists', 409)
    }
  }

  const vendor = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
  })

  return formatVendor(vendor)
}

/**
 * Delete a vendor
 * Cannot delete vendor with transactions (returns error)
 */
export async function deleteVendor(
  organizationId: string,
  vendorId: string
): Promise<{ deleted: boolean }> {
  const vendor = await prisma.vendor.findFirst({
    where: {
      id: vendorId,
      organizationId,
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  })

  if (!vendor) {
    throw new AppError('Vendor not found', 404)
  }

  // Cannot delete vendor with transactions
  if (vendor._count.transactions > 0) {
    throw new AppError('Cannot delete vendor with transactions', 400)
  }

  // Hard delete if no transactions
  await prisma.vendor.delete({
    where: { id: vendorId },
  })

  return { deleted: true }
}

/**
 * Validate that a vendor belongs to an organization
 * Used by transaction service
 */
export async function validateVendorOwnership(
  vendorId: string,
  organizationId: string
): Promise<boolean> {
  const vendor = await prisma.vendor.findFirst({
    where: {
      id: vendorId,
      organizationId,
    },
  })

  return !!vendor
}
