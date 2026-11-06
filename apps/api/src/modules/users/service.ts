import {HttpError} from '../../middleware/errors.js'
import {setPassword} from '../auth/service.js'
import * as repo from './repository.js'
import type {Role} from '../permissions/authorize.js'
export const list=(role:Role,search?:string)=>repo.listUsers(role,search)
export async function create(v:{name:string;email:string;password:string;role:'ADMIN'|'USER'},actorRole:Role,actorId:string){if(v.role==='ADMIN'&&actorRole!=='OWNER')throw new HttpError(403,'forbidden');const passwordHash=await setPassword(v.password);return repo.createUser({name:v.name,email:v.email.toLowerCase(),passwordHash,role:v.role},actorId)}
export async function update(id:string,patch:{name?:string;email?:string;role?:'ADMIN'|'USER'},actorRole:Role,actorId:string){if(patch.role&&actorRole!=='OWNER')throw new HttpError(403,'forbidden');const user=await repo.updateUser(id,{...patch,email:patch.email?.toLowerCase()},actorRole,actorId);if(!user)throw new HttpError(404,'not_found');return user}
export async function setStatus(id:string,status:'active'|'disabled',actorRole:Role,actorId:string){const user=await repo.updateUserStatus(id,status,actorRole,actorId);if(!user)throw new HttpError(404,'not_found');if(status==='disabled')await repo.revokeUserSessions(id);return user}
