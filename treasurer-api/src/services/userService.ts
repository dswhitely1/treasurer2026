import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import type { UpdateUserDto, PaginationParams } from '../schemas/user.js'

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function getUsers(pagination: PaginationParams) {
  const { page, limit } = pagination
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: userSelect,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  })

  if (!user) {
    throw new AppError('User not found', 404)
  }

  return user
}

export async function updateUser(id: string, data: UpdateUserDto) {
  const updateData: { name?: string; email?: string } = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.email !== undefined) updateData.email = data.email

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  })

  return user
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } })
}
