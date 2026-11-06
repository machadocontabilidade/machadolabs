import{pool}from'../../db/pool.js'
export async function findUserByEmail(email:string){const r=await pool.query('SELECT id,name,email,role,status,password_hash FROM users WHERE email=$1',[email]);return r.rows[0]}
export async function recordLoginFailure(email:string,ip:string){await pool.query("INSERT INTO security_events(event,ip,details) VALUES('login_failed',$1,$2)",[ip||null,{email}])}
export async function recordLoginSuccess(userId:string,ip:string){await pool.query("INSERT INTO security_events(user_id,event,ip) VALUES($1,'login_succeeded',$2)",[userId,ip||null])}
