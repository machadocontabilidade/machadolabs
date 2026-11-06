import argon2 from 'argon2'
import * as repo from './repository.js'
import {createSession} from '../sessions/service.js'
const dummyHash=await argon2.hash('machado-labs-invalid-login-placeholder',{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})
export async function login(email:string,password:string,ip:string){const user=await repo.findUserByEmail(email.toLowerCase());const valid=await argon2.verify(user?.password_hash??dummyHash,password).catch(()=>false);if(!user||user.status!=='active'||!valid){await repo.recordLoginFailure(email,ip);return null}await repo.recordLoginSuccess(user.id,ip);const session=await createSession(user.id);return{user:{id:user.id,name:user.name,email:user.email,role:user.role},session}}
export async function setPassword(password:string){return argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})}
