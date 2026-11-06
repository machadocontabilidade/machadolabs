import { z } from 'zod'
export const createUserSchema=z.object({name:z.string().trim().min(1).max(120),email:z.string().email().max(254),password:z.string().min(12).max(1024),role:z.enum(['ADMIN','USER']).default('USER')})
export const userStatusSchema=z.object({status:z.enum(['active','disabled'])})
export const updateUserSchema=z.object({name:z.string().trim().min(1).max(120).optional(),email:z.string().email().max(254).optional(),role:z.enum(['ADMIN','USER']).optional()}).refine(v=>Object.keys(v).length>0)
export const userListSchema=z.object({q:z.string().trim().max(120).optional()})
export const userIdSchema=z.string().uuid()
