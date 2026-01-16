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

export async function getOrganizationMembers(orgId: string): Promise<OrganizationMemberInfo[]> {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role as OrganizationRole,
    joinedAt: m.createdAt.toISOString(),
  }))
}

export async function addMember(
  orgId: string,
  email: string,
  role: OrganizationRole = 'MEMBER'
): Promise<OrganizationMemberInfo> {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new AppError('User not found. They must create an account first.', 404)
  }

  const existingMember = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
  })

  if (existingMember) {
    throw new AppError('User is already a member of this organization', 409)
  }

  const member = await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: orgId,
      role,
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  })

  return {
    id: member.id,
    userId: member.user.id,
    email: member.user.email,
    name: member.user.name,
    role: member.role as OrganizationRole,
    joinedAt: member.createdAt.toISOString(),
  }
}

export async function updateMemberRole(
  orgId: string,
  targetUserId: string,
  newRole: OrganizationRole
): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('Member not found', 404)
  }

  await prisma.organizationMember.update({
    where: { id: membership.id },
    data: { role: newRole },
  })
}

export async function removeMember(orgId: string, targetUserId: string): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('Member not found', 404)
  }

  await prisma.organizationMember.delete({
    where: { id: membership.id },
  })

  // Clear lastOrganizationId if this was their current org
  await prisma.user.updateMany({
    where: { id: targetUserId, lastOrganizationId: orgId },
    data: { lastOrganizationId: null },
  })
}

export async function leaveOrganization(userId: string, orgId: string): Promise<void> {
  const membership = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  })

  if (!membership) {
    throw new AppError('You are not a member of this organization', 403)
  }

  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId: orgId, role: 'OWNER' },
    })

    if (ownerCount === 1) {
      throw new AppError(
        'Cannot leave organization as the only owner. Transfer ownership first or delete the organization.',
        400
      )
    }
  }

  await prisma.organizationMember.delete({
    where: { id: membership.id },
  })

  await prisma.user.updateMany({
    where: { id: userId, lastOrganizationId: orgId },
    data: { lastOrganizationId: null },
  })
}
