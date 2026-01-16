import type { RequestHandler } from 'express'
import { registerUser, loginUser } from '../services/authService.js'
import { sendSuccess } from '../utils/response.js'
import type { RegisterDto, LoginDto } from '../schemas/auth.js'

export const register: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as RegisterDto
    const result = await registerUser(data)
    sendSuccess(res, result, 'Registration successful', 201)
  } catch (error) {
    next(error)
  }
}

export const login: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as LoginDto
    const result = await loginUser(data)
    sendSuccess(res, result, 'Login successful')
  } catch (error) {
    next(error)
  }
}

export const me: RequestHandler = (req, res) => {
  sendSuccess(res, { user: req.user })
}
