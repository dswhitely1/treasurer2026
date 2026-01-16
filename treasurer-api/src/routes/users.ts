import { Router, type IRouter } from 'express'
import { list, getById, update, remove } from '../controllers/userController.js'
import { validate } from '../middleware/validate.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { updateUserSchema, userIdSchema, paginationSchema } from '../schemas/user.js'

export const userRouter: IRouter = Router()

userRouter.use(authenticate)

userRouter.get('/', requireRole('ADMIN'), validate({ query: paginationSchema }), list)
userRouter.get('/:id', validate({ params: userIdSchema }), getById)
userRouter.patch('/:id', validate({ params: userIdSchema, body: updateUserSchema }), update)
userRouter.delete('/:id', requireRole('ADMIN'), validate({ params: userIdSchema }), remove)
