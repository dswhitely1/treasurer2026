import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import type { OrganizationRole, OrganizationSummary, OrganizationMemberInfo } from '../types/index.js'

export interface CreateOrganizationInput {
  name: string
}

export interface UpdateOrganizationInput {
  name: string
}

export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput
): Promise<OrganizationSummary> {
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.name },
    })

    await tx.organizationMember.create({
      data: {
        userId,
        organizationId: organization.id,
        role: 'OWNER',
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: { lastOrganizationId: organization.id },
    })

    return organization
  })

  return {
    id: result.id,
    name: result.name,
    role: 'OWNER',
  }
}

export async function getUserOrganizations(userId: string): Promise<OrganizationSummary[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  })

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role as OrganizationRole,
  }))
}

export async function getOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  })

  if (!org) {
    throw new AppError('Organization not found', 404)
  }

  return org
}

export async function updateOrganization(orgId: string, input: UpdateOrganizationInput) {
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { name: input.name },
  })

  return org
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await prisma.organization.delete({
    where: { id: orgId },
  })
}

export async function getMemberRole(
  userId: string,
  orgId: string
): Promise<OrganizationRole | null> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  })

  return membership?.role as OrganizationRole | null
}

export async function switchOrganization(userId: string, orgId: string): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('You are not a member of this organization', 403)
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastOrganizationId: orgId },
  })
}
