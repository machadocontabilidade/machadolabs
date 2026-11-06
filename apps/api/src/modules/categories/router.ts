import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../../db/pool.js'
import { allowRoles } from '../permissions/authorize.js'

export const categoriesRouter = Router()
const nameSchema = z.string().trim().min(1).max(80)
const bodySchema = z.object({ name: nameSchema })

categoriesRouter.get('/', async (_req, res, next) => {
  try { const result = await pool.query('SELECT name,created_at,updated_at FROM categories ORDER BY name'); res.json({ categories: result.rows }) }
  catch (error) { next(error) }
})
categoriesRouter.post('/', allowRoles('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const { name } = bodySchema.parse(req.body)
    const result = await pool.query('INSERT INTO categories(name) VALUES($1) RETURNING name,created_at,updated_at', [name])
    await pool.query("INSERT INTO security_events(user_id,event,details) VALUES($1,'category_created',$2)", [req.auth!.userId, { resource: 'category', name }])
    res.status(201).json({ category: result.rows[0] })
  } catch (error: any) { if (error.code === '23505') return res.status(409).json({ error: 'category_unavailable' }); next(error) }
})
categoriesRouter.put('/:name', allowRoles('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const oldName = nameSchema.parse(req.params.name), { name } = bodySchema.parse(req.body)
    const result = await pool.query('UPDATE categories SET name=$1,updated_at=now() WHERE name=$2 RETURNING name,created_at,updated_at', [name, oldName])
    if (!result.rowCount) return res.status(404).json({ error: 'not_found' })
    await pool.query("INSERT INTO security_events(user_id,event,details) VALUES($1,'category_updated',$2)", [req.auth!.userId, { resource: 'category', oldName, name }])
    res.json({ category: result.rows[0] })
  } catch (error: any) { if (error.code === '23505') return res.status(409).json({ error: 'category_unavailable' }); next(error) }
})
categoriesRouter.delete('/:name', allowRoles('OWNER', 'ADMIN'), async (req, res, next) => {
  try {
    const name = nameSchema.parse(req.params.name)
    const result = await pool.query('DELETE FROM categories WHERE name=$1 RETURNING name', [name])
    if (!result.rowCount) return res.status(404).json({ error: 'not_found' })
    await pool.query("INSERT INTO security_events(user_id,event,details) VALUES($1,'category_deleted',$2)", [req.auth!.userId, { resource: 'category', name }])
    res.status(204).end()
  } catch (error: any) { if (error.code === '23503') return res.status(409).json({ error: 'category_in_use' }); next(error) }
})
