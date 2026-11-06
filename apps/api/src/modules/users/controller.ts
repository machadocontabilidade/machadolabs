import type {Request,Response,NextFunction} from 'express'
import * as service from './service.js'
import {createUserSchema,userStatusSchema,userIdSchema,updateUserSchema,userListSchema} from './validation.js'
export function me(req:Request,res:Response){res.json({id:req.auth!.userId,name:req.auth!.name,email:req.auth!.email,role:req.auth!.role})}
export async function list(req:Request,res:Response,next:NextFunction){try{const query=userListSchema.parse(req.query);res.json({users:await service.list(req.auth!.role,query.q)})}catch(e){next(e)}}
export async function create(req:Request,res:Response,next:NextFunction){try{res.status(201).json({user:await service.create(createUserSchema.parse(req.body),req.auth!.role,req.auth!.userId)})}catch(e:any){if(e.code==='23505')return res.status(409).json({error:'email_unavailable'});next(e)}}
export async function update(req:Request,res:Response,next:NextFunction){try{const id=userIdSchema.parse(req.params.id),body=updateUserSchema.parse(req.body);res.json({user:await service.update(id,body,req.auth!.role,req.auth!.userId)})}catch(e:any){if(e.code==='23505')return res.status(409).json({error:'email_unavailable'});next(e)}}
export async function setStatus(req:Request,res:Response,next:NextFunction){try{const id=userIdSchema.parse(req.params.id),body=userStatusSchema.parse(req.body);res.json({user:await service.setStatus(id,body.status,req.auth!.role,req.auth!.userId)})}catch(e){next(e)}}
