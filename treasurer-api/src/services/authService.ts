import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { AppError } from '../middleware/errorHandler.js'
import type { JwtPayload, OrganizationSummary } from '../types/index.js'

const SALT_ROUNDS = 12

export interface RegisterInput {
  email: string
  password: string
  name?: string | undefined
}

export interface LoginInput {
  email: string
  password: string
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (existingUser) {
    throw new AppError('Email already registered', 409)
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })

  const token = generateToken(user.id, user.email, user.role)

  return { user, token }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  const isValidPassword = await bcrypt.compare(input.password, user.password)

  if (!isValidPassword) {
    throw new AppError('Invalid credentials', 401)
  }

  const token = generateToken(user.id, user.email, user.role)

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  }
}

function generateToken(userId: string, email: string, role: string): string {
  const payload: JwtPayload = { userId, email, role }
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as `${number}d` })
}

export async function getCurrentUserWithOrgs(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastOrganizationId: true,
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  const organizations: OrganizationSummary[] = user.memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: m.role as 'OWNER' | 'ADMIN' | 'MEMBER',
  }))

  let currentOrganization: OrganizationSummary | null = null

  if (user.lastOrganizationId) {
    currentOrganization = organizations.find((o) => o.id === user.lastOrganizationId) ?? null
  }

  // If lastOrganizationId is invalid or null, default to first org
  if (!currentOrganization && organizations.length > 0) {
    const firstOrg = organizations[0]
    if (firstOrg) {
      currentOrganization = firstOrg
      // Update lastOrganizationId
      await prisma.user.update({
        where: { id: userId },
        data: { lastOrganizationId: firstOrg.id },
      })
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    organizations,
    currentOrganization,
  }
}
