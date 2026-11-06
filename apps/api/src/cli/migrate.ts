import {readdir,readFile} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {pool} from '../db/pool.js'
const migrationDir=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..','database','migrations')
const c=await pool.connect()
try{await c.query('SELECT pg_advisory_lock(7432109)');await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())');for(const name of(await readdir(migrationDir)).filter(x=>x.endsWith('.sql')).sort()){const seen=await c.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name]);if(seen.rowCount)continue;await c.query('BEGIN');try{await c.query(await readFile(resolve(migrationDir,name),'utf8'));await c.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);await c.query('COMMIT');console.log(`Applied ${name}`)}catch(e){await c.query('ROLLBACK');throw e}}}finally{await c.query('SELECT pg_advisory_unlock(7432109)');c.release();await pool.end()}
