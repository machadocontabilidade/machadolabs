import {HttpError} from '../../middleware/errors.js'
import {hasToolAccess,type Role} from '../permissions/authorize.js'
import * as repo from './repository.js'
export async function listAuthorized(userId:string,role:Role,filters:{q?:string;category?:string;status?:string}){const all=await repo.listTools(filters);if(role==='OWNER'||role==='ADMIN')return all;const result=[];for(const tool of all)if(await hasToolAccess(userId,role,tool.id))result.push(tool);return result}
export async function readAuthorized(userId:string,role:Role,id:string){const tool=await repo.findTool(id);if(!tool)throw new HttpError(404,'not_found');if(!await hasToolAccess(userId,role,id))throw new HttpError(403,'forbidden');return tool}
export async function create(v:{name:string;description:string;icon:string;category:string;route:string;status:string;responsibleId?:string|null},userId:string){return repo.createTool(v,userId)}
export async function update(id:string,v:Record<string,unknown>,userId:string){const tool=await repo.updateTool(id,v,userId);if(!tool)throw new HttpError(404,'not_found');return tool}
export const getUsers=repo.getToolUserIds
export const setUsers=repo.setToolUserIds
