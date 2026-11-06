import {Router} from 'express'
import * as controller from './controller.js'
import {allowRoles} from '../permissions/authorize.js'
export const usersRouter=Router()
usersRouter.get('/me',controller.me)
usersRouter.get('/',allowRoles('OWNER','ADMIN'),controller.list)
usersRouter.post('/',allowRoles('OWNER','ADMIN'),controller.create)
usersRouter.patch('/:id',allowRoles('OWNER','ADMIN'),controller.update)
usersRouter.patch('/:id/status',allowRoles('OWNER','ADMIN'),controller.setStatus)
