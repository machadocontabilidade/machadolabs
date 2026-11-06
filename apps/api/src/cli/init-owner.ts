import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { pool } from '../db/pool.js'
import { setPassword } from '../modules/auth/service.js'

function question(label: string) {
  const rl = createInterface({ input: stdin, output: stdout })
  return new Promise<string>((resolve) => rl.question(label, (answer) => { rl.close(); resolve(answer.trim()) }))
}

function password(label: string) {
  return new Promise<string>((resolve) => {
    stdout.write(label)
    let value = ''
    const input = stdin as NodeJS.ReadStream & { setRawMode?: (mode: boolean) => void }
    if (!input.isTTY || !input.setRawMode) {
      stdout.write('\n')
      resolve('')
      return
    }
    input.setRawMode(true)
    input.resume()
    const onData = (buffer: Buffer) => {
      const character = buffer.toString()
      if (character === '\r' || character === '\n') {
        input.setRawMode!(false)
        input.pause()
        input.removeListener('data', onData)
        stdout.write('\n')
        resolve(value)
      } else if (character === '\u0003') {
        input.setRawMode!(false)
        input.pause()
        input.removeListener('data', onData)
        process.exitCode = 130
        resolve('')
      } else if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1)
      } else if (character >= ' ' && character <= '~') {
        value += character
      }
    }
    input.on('data', onData)
  })
}

try {
  const existing = await pool.query('SELECT count(*)::int AS n FROM users')
  if (existing.rows[0].n !== 0) throw new Error('OWNER initialization is only allowed when users table is empty.')

  const name = await question('Nome do OWNER: ')
  const email = (await question('E-mail do OWNER: ')).toLowerCase()
  const secret = await password('Senha (mínimo 12 caracteres): ')
  if (!name || !email.includes('@') || secret.length < 12) throw new Error('Nome, e-mail válido e senha com pelo menos 12 caracteres são obrigatórios.')

  const hash = await setPassword(secret)
  const client = await pool.connect()
  let inTransaction = false
  try {
    await client.query('BEGIN')
    inTransaction = true
    await client.query('SELECT pg_advisory_xact_lock(901734)')
    const count = await client.query('SELECT count(*)::int AS n FROM users')
    if (count.rows[0].n !== 0) throw new Error('OWNER initialization is only allowed when users table is empty.')
    await client.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'OWNER')", [name, email, hash])
    await client.query("INSERT INTO security_events(event,details) VALUES('owner_initialized',$1)", [{ email }])
    await client.query('COMMIT')
    inTransaction = false
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
  console.log('OWNER inicial criado. Guarde a senha em um gerenciador seguro.')
} finally {
  await pool.end()
}
