import type {Request,Response,NextFunction} from 'express'
import {pool} from '../../db/pool.js'
export type Role='OWNER'|'ADMIN'|'USER'
export function allowRoles(...roles:Role[]){return(req:Request,res:Response,next:NextFunction)=>{if(!req.auth||!roles.includes(req.auth.role))return res.status(403).json({error:'forbidden'});next()}}
export async function hasToolAccess(userId:string,role:Role,toolId:string){if(role==='OWNER'||role==='ADMIN')return true;const r=await pool.query("SELECT 1 FROM user_permissions up JOIN permissions p ON p.id=up.permission_id WHERE up.user_id=$1 AND p.name='tools:read' AND (up.tool_id=$2 OR up.tool_id IS NULL) LIMIT 1",[userId,toolId]);return r.rowCount===1}
