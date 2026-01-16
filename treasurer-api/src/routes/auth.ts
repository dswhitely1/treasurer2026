import { Router, type IRouter } from 'express'
import { register, login, me } from '../controllers/authController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { registerSchema, loginSchema } from '../schemas/auth.js'

export const authRouter: IRouter = Router()

authRouter.post('/register', validate({ body: registerSchema }), register)
authRouter.post('/login', validate({ body: loginSchema }), login)
authRouter.get('/me', authenticate, me)
