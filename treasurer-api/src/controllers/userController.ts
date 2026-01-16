import type { RequestHandler } from 'express'
import { getUsers, getUserById, updateUser, deleteUser } from '../services/userService.js'
import { sendSuccess, sendPaginated } from '../utils/response.js'
import type { UpdateUserDto, PaginationParams } from '../schemas/user.js'

export const list: RequestHandler = async (req, res, next) => {
  try {
    const pagination = req.query as unknown as PaginationParams
    const result = await getUsers(pagination)
    sendPaginated(res, result.users, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id as string)
    sendSuccess(res, user)
  } catch (error) {
    next(error)
  }
}

export const update: RequestHandler = async (req, res, next) => {
  try {
    const user = await updateUser(req.params.id as string, req.body as UpdateUserDto)
    sendSuccess(res, user, 'User updated successfully')
  } catch (error) {
    next(error)
  }
}

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await deleteUser(req.params.id as string)
    sendSuccess(res, null, 'User deleted successfully', 204)
  } catch (error) {
    next(error)
  }
}
