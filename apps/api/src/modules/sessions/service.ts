import{randomBytes,createHash}from'node:crypto';import{env}from'../../config/env.js';import * as repo from './repository.js'
const digest=(v:string)=>createHash('sha256').update(v).digest()
export function newSecret(){return randomBytes(32).toString('base64url')}
export async function createSession(userId:string){const token=newSecret(),csrf=newSecret(),expiresAt=new Date(Date.now()+env.SESSION_TTL_HOURS*3600000);const sessionId=await repo.insertSession(userId,digest(token),digest(csrf),expiresAt);return{sessionId,token,csrf,expiresAt}}
export async function rotateSession(sessionId:string,userId:string){const token=newSecret(),csrf=newSecret(),expiresAt=new Date(Date.now()+env.SESSION_TTL_HOURS*3600000);const id=await repo.replaceSession(sessionId,userId,digest(token),digest(csrf),expiresAt);return{sessionId:id,token,csrf,expiresAt}}
export const hashSecret=digest
export const setSessionCsrf=repo.updateCsrf
export const findSessionForToken=(token:string)=>repo.sessionForToken(digest(token))
