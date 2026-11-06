import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const connectionString=process.env.TEST_DATABASE_URL
if(!connectionString){test('PostgreSQL integration suite',{skip:'Configure TEST_DATABASE_URL to a disposable local database whose name ends with _test.'},()=>{});process.exitCode=0}
else{
 const testUrl=new URL(connectionString)
 const dbName=testUrl.pathname.slice(1)
 if(!['localhost','127.0.0.1','::1'].includes(testUrl.hostname)||dbName.toLowerCase()!=='machado_labs_test')throw new Error('Refusing destructive integration setup: use the local machado_labs_test database.')
 process.env.NODE_ENV='test';process.env.DATABASE_URL=connectionString;process.env.WEB_ORIGIN='http://localhost:5173';process.env.RATE_LIMIT_MAX_ATTEMPTS='10'
 const {test:run}=await import('node:test');const {Pool}=await import('pg');const argon2=(await import('argon2')).default
 run('auth, session, CSRF, rate limit, permissions and tools against PostgreSQL',async()=>{
  const adminDb=new Pool({connectionString});let pool:any;let server:any;let base='';let canCleanTestData=false;
  try{
   const identity=await adminDb.query('SELECT current_database() AS name');assert.equal(identity.rows[0].name,dbName,'integration suite must use TEST_DATABASE_URL');
   await adminDb.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())')
   const{readdir,readFile}=await import('node:fs/promises');const{join,resolve,dirname}=await import('node:path');const{fileURLToPath}=await import('node:url');const migrationDir=resolve(dirname(fileURLToPath(import.meta.url)),'../../..','database','migrations')
   for(const name of(await readdir(migrationDir)).filter(x=>x.endsWith('.sql')).sort()){
    const exists=await adminDb.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name]);if(exists.rowCount)continue
    await adminDb.query('BEGIN');try{await adminDb.query(await readFile(join(migrationDir,name),'utf8'));await adminDb.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);await adminDb.query('COMMIT')}catch(e){await adminDb.query('ROLLBACK');throw e}
   }
   const existing=await adminDb.query("SELECT (SELECT count(*) FROM users)::int users,(SELECT count(*) FROM sessions)::int sessions,(SELECT count(*) FROM tools)::int tools,(SELECT count(*) FROM categories)::int categories,(SELECT count(*) FROM user_permissions)::int user_permissions,(SELECT count(*) FROM security_events)::int security_events,(SELECT count(*) FROM rate_limits)::int rate_limits");
   if(Object.values(existing.rows[0]).some(count=>count!==0))throw new Error('Refusing destructive integration setup: machado_labs_test contains domain data.');
   canCleanTestData=true;
   await adminDb.query('TRUNCATE security_events,rate_limits,user_permissions,sessions,tools,categories,users RESTART IDENTITY CASCADE')
   const hash=await argon2.hash('StrongOwnerPassword-2026',{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})
   await adminDb.query("INSERT INTO users(name,email,password_hash,role) VALUES('Test Owner','owner@example.test',$1,'OWNER')",[hash])
   await assert.rejects(()=>adminDb.query("INSERT INTO tools(name,category,route,status) VALUES('Invalid','Test','/invalid','coming_soon')"))
   const{createApp}=await import('../src/app.js');const{env,allowedWebOrigin}=await import('../src/config/env.js');({pool}=await import('../src/db/pool.js'));const appIdentity=await pool.query('SELECT current_database() AS name');assert.equal(appIdentity.rows[0].name,'machado_labs_test','API requests must use machado_labs_test')
   const app=createApp();assert.equal(app.get('trust proxy'),false);server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}/api`
   type Jar={cookie:string;csrf:string}
   async function call(path:string,jar:Jar,method='GET',body?:unknown,ip='127.0.0.1',origin='http://localhost:5173'){
    const headers:Record<string,string>={cookie:jar.cookie,'x-forwarded-for':ip};if(method!=='GET'){headers.origin=origin;headers['x-csrf-token']=jar.csrf;headers['content-type']='application/json'}
    const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const cookies=response.headers.getSetCookie().map(x=>x.split(';')[0]);for(const pair of cookies){const name=pair.slice(0,pair.indexOf('='));const existing=jar.cookie.split('; ').filter(x=>x&&!x.startsWith(name+'='));jar.cookie=[...existing,pair].join('; ');if(name==='ml_csrf')jar.csrf=decodeURIComponent(pair.slice(name.length+1))}return response
   }
   const owner:Jar={cookie:'',csrf:''};let r=await call('/auth/csrf',owner);owner.csrf=(await r.json()).csrfToken;assert.equal(r.status,200)
   r=await call('/auth/login',owner,'POST',{email:'owner@example.test',password:'wrong'});assert.equal(r.status,401);assert.equal((await r.json()).error,'invalid_credentials')
   r=await call('/auth/login',owner,'POST',{email:'owner@example.test',password:'StrongOwnerPassword-2026'});assert.equal(r.status,200);assert.ok(owner.cookie.includes('ml_session='));owner.csrf=(await r.json()).csrfToken;for(const cookie of r.headers.getSetCookie()){assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=Lax/i);assert.doesNotMatch(cookie,/; Secure/i)}
   const allowedCors=await fetch(base+'/auth/session',{headers:{origin:'http://localhost:5173',cookie:owner.cookie}});assert.equal(allowedCors.headers.get('access-control-allow-origin'),'http://localhost:5173');assert.equal(allowedCors.headers.get('access-control-allow-credentials'),'true')
   const deniedOrigin=await fetch(base+'/auth/login',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({email:'owner@example.test',password:'StrongOwnerPassword-2026'})});assert.equal(deniedOrigin.status,403);assert.equal(deniedOrigin.headers.get('access-control-allow-origin'),null)
   const invalidCsrf=await fetch(base+'/auth/login',{method:'POST',headers:{origin:'http://localhost:5173',cookie:owner.cookie,'x-csrf-token':'invalid','content-type':'application/json'},body:JSON.stringify({email:'owner@example.test',password:'StrongOwnerPassword-2026'})});assert.equal(invalidCsrf.status,403);assert.equal((await invalidCsrf.json()).error,'csrf_invalid')
   const csrfMissing=await fetch(base+'/tools',{method:'POST',headers:{origin:'http://localhost:5173',cookie:owner.cookie,'content-type':'application/json'},body:'{}'});assert.equal(csrfMissing.status,403)
   r=await call('/users',owner,'POST',{name:'Tool User',email:'user@example.test',password:'StrongUserPassword-2026',role:'USER'});assert.equal(r.status,201);const userId=(await r.json()).user.id
   r=await call('/users?q=Tool',owner);assert.equal(r.status,200);assert.equal((await r.json()).users[0].id,userId)
   r=await call('/users',owner,'POST',{name:'Weak Password',email:'weak@example.test',password:'short',role:'USER'});assert.equal(r.status,400)
   r=await call('/users',owner,'POST',{name:'Admin User',email:'admin@example.test',password:'StrongAdminPassword-2026',role:'ADMIN'});assert.equal(r.status,201)
   r=await call('/categories',owner,'POST',{name:'Tests'});assert.equal(r.status,201)
   r=await call('/categories',owner,'POST',{name:'Unused'});assert.equal(r.status,201)
   r=await call('/tools',owner,'POST',{name:'Internal Test Tool',description:'A persistent test tool',icon:'file-spreadsheet',category:'Tests',route:'/test-tool',status:'available'});assert.equal(r.status,201);const tool=(await r.json()).tool
   r=await call('/tools',owner,'POST',{name:'Invalid Icon Tool',description:'',icon:'📊',category:'Tests',route:'/invalid-icon',status:'available'});assert.equal(r.status,400)
   r=await call(`/tools/${tool.id}`,owner,'PUT',{...tool,name:'Updated Test Tool',status:'maintenance'});assert.equal(r.status,200);assert.equal((await r.json()).tool.name,'Updated Test Tool')
   const admin:Jar={cookie:'',csrf:''};r=await call('/auth/csrf',admin);admin.csrf=(await r.json()).csrfToken;r=await call('/auth/login',admin,'POST',{email:'admin@example.test',password:'StrongAdminPassword-2026'});assert.equal(r.status,200);const adminLogin=await r.json();assert.equal(adminLogin.user.role,'ADMIN');admin.csrf=adminLogin.csrfToken
   r=await call('/tools',admin);assert.equal(r.status,200);assert.equal((await r.json()).tools.length,1)
   r=await call('/users',admin);assert.equal(r.status,200)
   r=await call(`/users/${userId}`,admin,'PATCH',{name:'Changed by admin',role:'ADMIN'});assert.equal(r.status,403)
   r=await call(`/tools/${tool.id}/permissions`,admin);assert.equal(r.status,403)
   r=await call('/dashboard/admin',admin);assert.equal(r.status,200);const dashboard=await r.json();assert.equal(dashboard.tools.total,1);assert.deepEqual({available:dashboard.tools.available,development:dashboard.tools.development,maintenance:dashboard.tools.maintenance,unavailable:dashboard.tools.unavailable},{available:0,development:0,maintenance:1,unavailable:0})
   r=await call('/tools',admin,'POST',{name:'Admin Test Tool',description:'Managed by ADMIN',icon:'calculator',category:'Tests',route:'/admin-test-tool',status:'available'});assert.equal(r.status,201);const adminTool=(await r.json()).tool
   r=await call(`/tools/${adminTool.id}`,admin,'PUT',{...adminTool,name:'Admin Updated Tool'});assert.equal(r.status,200);assert.equal((await r.json()).tool.name,'Admin Updated Tool')
   r=await call('/dashboard/admin',admin);const updatedDashboard=await r.json();assert.equal(updatedDashboard.tools.total,2);assert.deepEqual({available:updatedDashboard.tools.available,development:updatedDashboard.tools.development,maintenance:updatedDashboard.tools.maintenance,unavailable:updatedDashboard.tools.unavailable},{available:1,development:0,maintenance:1,unavailable:0});assert.ok(updatedDashboard.activity.some((item:any)=>item.action==='tool_updated'&&item.actor==='Admin User'&&item.at&&item.resource==='tool'&&item.resource_id===adminTool.id))
   const user:Jar={cookie:'',csrf:''};r=await call('/auth/csrf',user);user.csrf=(await r.json()).csrfToken;r=await call('/auth/login',user,'POST',{email:'user@example.test',password:'StrongUserPassword-2026'});assert.equal(r.status,200);user.csrf=(await r.json()).csrfToken
   r=await call('/tools',user);assert.equal(r.status,200);assert.equal((await r.json()).tools.length,0)
   r=await call('/users',user);assert.equal(r.status,403)
   r=await call('/tools',user,'POST',{name:'Forbidden Tool',category:'Tests',route:'/forbidden',status:'available'});assert.equal(r.status,403)
   r=await call(`/tools/${tool.id}`,user,'GET');assert.equal(r.status,403)
   r=await call(`/tools/${tool.id}/permissions`,owner,'PUT',{userIds:[userId]});assert.equal(r.status,204)
   r=await call(`/tools/${tool.id}/permissions`,owner);assert.equal(r.status,200);assert.deepEqual((await r.json()).userIds,[userId])
   r=await call('/categories/Unused',owner,'PUT',{name:'Shared'});assert.equal(r.status,200)
   r=await call('/categories/Tests',owner,'DELETE');assert.equal(r.status,409);assert.equal((await r.json()).error,'category_in_use')
   const audit=await adminDb.query("SELECT e.event,e.user_id,e.created_at,e.details,u.name AS actor FROM security_events e LEFT JOIN users u ON u.id=e.user_id WHERE e.event IN ('user_created','user_updated','user_role_changed','user_status_changed','tool_created','tool_updated','tool_permissions_changed','category_created','category_updated','category_deleted')");assert.ok(audit.rows.length>=4);assert.ok(audit.rows.every((row:any)=>row.user_id&&row.actor&&row.created_at));assert.ok(audit.rows.every((row:any)=>!/(password|token|secret|authorization)/i.test(JSON.stringify(row.details))))
   await assert.rejects(()=>adminDb.query('INSERT INTO user_permissions(user_id,permission_id,tool_id) SELECT gen_random_uuid(),id,$1 FROM permissions WHERE name=$2',[tool.id,'tools:read']))
   r=await call('/tools',user);assert.equal((await r.json()).tools.length,1)
   r=await call(`/users/${userId}`,owner,'PATCH',{name:'Updated Tool User',role:'ADMIN'});assert.equal(r.status,200);assert.equal((await r.json()).user.role,'ADMIN')
   const oldOwnerCookie=owner.cookie
   env.NODE_ENV='production';assert.equal(allowedWebOrigin(),'https://machadolabs.vercel.app');assert.equal(createApp().get('trust proxy'),1);r=await call('/auth/rotate',owner,'POST',{},'127.0.0.1','https://machadolabs.vercel.app');assert.equal(r.status,200);owner.csrf=(await r.json()).csrfToken;for(const cookie of r.headers.getSetCookie()){assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=None/i);assert.match(cookie,/; Secure/i)};const productionCors=await fetch(base+'/auth/session',{headers:{origin:'https://machadolabs.vercel.app',cookie:owner.cookie}});assert.equal(productionCors.headers.get('access-control-allow-origin'),'https://machadolabs.vercel.app');assert.equal(productionCors.headers.get('access-control-allow-credentials'),'true');const wrongProductionCors=await fetch(base+'/auth/session',{headers:{origin:'https://evil.example',cookie:owner.cookie}});assert.equal(wrongProductionCors.headers.get('access-control-allow-origin'),null);env.NODE_ENV='test'
   const oldSession=await fetch(base+'/auth/session',{headers:{cookie:oldOwnerCookie}});assert.equal(oldSession.status,401)
   const session=await fetch(base+'/auth/session',{headers:{cookie:owner.cookie}});assert.equal(session.status,200)
   r=await call(`/users/${userId}/status`,owner,'PATCH',{status:'disabled'});const blockedUser=await r.json();assert.equal(r.status,200,JSON.stringify(blockedUser));assert.equal(blockedUser.user.status,'disabled')
   const disabled=await fetch(base+'/auth/session',{headers:{cookie:user.cookie}});assert.equal(disabled.status,401)
   r=await call(`/users/${userId}/status`,owner,'PATCH',{status:'active'});assert.equal(r.status,200);assert.equal((await r.json()).user.status,'active')
   env.NODE_ENV='production';r=await call('/auth/logout',owner,'POST',{},'127.0.0.1','https://machadolabs.vercel.app');assert.equal(r.status,204);for(const cookie of r.headers.getSetCookie()){assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=None/i);assert.match(cookie,/; Secure/i)};env.NODE_ENV='test';r=await call('/auth/session',owner);assert.equal(r.status,401)
   const expiredToken=user.cookie.split('; ').find(x=>x.startsWith('ml_session='))!.slice('ml_session='.length)
   const{createHash}=await import('node:crypto');await adminDb.query('UPDATE sessions SET expires_at=now()-interval \'1 minute\' WHERE token_hash=$1',[createHash('sha256').update(decodeURIComponent(expiredToken)).digest()]);r=await call('/auth/session',user);assert.equal(r.status,401)
   const throttle:Jar={cookie:'',csrf:''};r=await call('/auth/csrf',throttle);throttle.csrf=(await r.json()).csrfToken
   for(let i=0;i<10;i++){r=await call('/auth/login',throttle,'POST',{email:'throttle@example.test',password:'wrong' },'127.0.0.8');assert.equal(r.status,401)}
   r=await call('/auth/login',throttle,'POST',{email:'throttle@example.test',password:'wrong'},'127.0.0.8');assert.equal(r.status,429)
  }finally{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));if(pool)await pool.end();if(canCleanTestData)await adminDb.query('TRUNCATE security_events,rate_limits,user_permissions,sessions,tools,categories,users RESTART IDENTITY CASCADE').catch(()=>{});await adminDb.end()}
 })
}

