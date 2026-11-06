import { createApp } from './app.js'
import { pool } from './db/pool.js'
import { env } from './config/env.js'
const server=createApp().listen(env.API_PORT,()=>console.log(`Machado Labs API listening on ${env.API_PORT}`))
const cleanup=setInterval(()=>{void pool.query('DELETE FROM sessions WHERE expires_at<=now()');void pool.query("DELETE FROM rate_limits WHERE updated_at<now()-interval '2 days'")},60*60*1000)
cleanup.unref()
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(async()=>{clearInterval(cleanup);await pool.end();process.exit(0)}))
