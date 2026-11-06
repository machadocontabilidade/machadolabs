import {Router} from 'express'
import * as controller from './controller.js'
import {allowRoles} from '../permissions/authorize.js'
export const toolsRouter=Router()
toolsRouter.get('/',controller.list)
toolsRouter.get('/:id/permissions',allowRoles('OWNER'),controller.readPermissions)
toolsRouter.get('/:id',controller.get)
toolsRouter.post('/',allowRoles('OWNER','ADMIN'),controller.create)
toolsRouter.put('/:id',allowRoles('OWNER','ADMIN'),controller.update)
toolsRouter.put('/:id/permissions',allowRoles('OWNER'),controller.writePermissions)
