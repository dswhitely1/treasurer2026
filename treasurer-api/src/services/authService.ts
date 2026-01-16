import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { AppError } from '../middleware/errorHandler.js'
import type { JwtPayload } from '../types/index.js'

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
