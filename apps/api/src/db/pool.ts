import pg from 'pg'
import { env } from '../config/env.js'
export const pool=new pg.Pool({connectionString:env.DATABASE_URL,max:12,statement_timeout:10000,idle_in_transaction_session_timeout:10000})
