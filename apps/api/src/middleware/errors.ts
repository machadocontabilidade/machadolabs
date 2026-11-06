import type { ErrorRequestHandler } from 'express'
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export const errorHandler:ErrorRequestHandler=(error,_req,res,_next)=>{if(error instanceof HttpError){res.status(error.status).json({error:error.message});return}if(error?.name==='ZodError'){res.status(400).json({error:'invalid_request'});return}console.error('request_failed',error);res.status(500).json({error:'internal_error'})}
