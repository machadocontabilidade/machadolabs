import { z } from 'zod'
export const toolIdSchema=z.string().uuid()
export const toolListSchema=z.object({q:z.string().max(120).optional(),category:z.string().max(80).optional(),status:z.enum(['available','development','maintenance','unavailable']).optional()})
export const toolSchema=z.object({name:z.string().trim().min(1).max(120),description:z.string().max(2000).default(''),icon:z.string().max(120).default(''),category:z.string().trim().min(1).max(80),route:z.string().regex(/^\/(?!\/)[a-zA-Z0-9/_-]+$/).max(200),status:z.enum(['available','development','maintenance','unavailable']).default('available'),responsibleId:z.string().uuid().nullable().optional()})
export const permissionUpdateSchema=z.object({userIds:z.array(z.string().uuid()).max(1000)})
