import 'dotenv/config'
import dotenv from 'dotenv'
dotenv.config({ path: 'apps/api/.env' })
import { z } from 'zod'
export const env=z.object({NODE_ENV:z.enum(['development','test','production']).default('development'),API_PORT:z.coerce.number().int().min(1).max(65535).default(3001),DATABASE_URL:z.string().min(1),WEB_ORIGIN:z.string().url(),SESSION_TTL_HOURS:z.coerce.number().int().min(1).max(720).default(12),SESSION_ROTATE_MINUTES:z.coerce.number().int().min(5).max(720).default(30),RATE_LIMIT_WINDOW_SECONDS:z.coerce.number().int().min(60).default(900),RATE_LIMIT_MAX_ATTEMPTS:z.coerce.number().int().min(1).default(10)}).parse(process.env)
export const allowedWebOrigin=()=>env.NODE_ENV==='production'?'https://machadolabs.vercel.app':env.WEB_ORIGIN
