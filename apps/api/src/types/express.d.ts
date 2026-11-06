import type { Role } from '../modules/permissions/authorize.js'
declare global { namespace Express { interface Request { auth?: { sessionId:string; userId:string; name:string; email:string; role:Role; expiresAt:Date } } } }
export {}
